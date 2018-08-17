import wu from 'wu';

import {NiceSet, setDefault} from './utilsForFrontend';
import {OutwardRhs} from './rhs';


/**
 * Construct and return the proper type of rule class based on the
 * inwardness/outwardness of the RHS.
 */
function rule(lhs, rhs) {
    // Since out() is a valid call only on the RHS (unlike type()), we can take
    // a shortcut here: any outward RHS will already be an OutwardRhs; we don't
    // need to sidetrack it through being a Side. And OutwardRhs has an asRhs()
    // that just returns itself.
    return new ((rhs instanceof OutwardRhs) ? OutwardRule : InwardRule)(lhs, rhs);
}

/**
 * We place the in/out distinction in Rules because it determines whether the
 * RHS result is cached, and Rules are responsible for maintaining the rulewise
 * cache ruleset.ruleCache.
 */
class Rule {  // abstract
    constructor(lhs, rhs) {
        this.lhs = lhs.asLhs();
        this.rhs = rhs.asRhs();
    }

    /**
     * Return a NiceSet of the rules that this one shallowly depends on in the
     * given ruleset. In a BoundRuleset, this may include rules that have
     * already been executed.
     *
     * Depend on emitters of any LHS type this rule finalizes. (See
     * _typesFinalized for a definition.) Depend on adders of any other LHS
     * types (because, after all, we need to know what nodes have that type in
     * order to find the set of LHS nodes). This works for simple rules and
     * complex ones like and().
     *
     * Specific examples (where A is a type):
     * * A.max->* depends on anything emitting A.
     * * Even A.max->A depends on A emitters, because we have to have all the
     *   scores factored in first. For example, what if we did
     *   max(A)->score(.5)?
     * * A->A depends on anything adding A.
     * * A->(something other than A) depends on anything emitting A. (For
     *   example, we need the A score finalized before we could transfer it to
     *   B using conserveScore().)
     * * A->out() also depends on anything emitting A. Fnode methods aren't
     *   smart enough to lazily run emitter rules as needed. We could make them
     *   so if it was shown to be an advantage.
     */
    prerequisites(ruleset) {
        // Optimization: we could cache the result of this when in a compiled (immutable) ruleset.

        // Extend prereqs with rules derived from each of the give types. If no
        // rules are found, raise an exception, as that indicates a malformed
        // ruleset.
        function extendOrThrow(prereqs, types, ruleGetter, verb) {
            for (let type of types) {
                const rules = ruleGetter(type);
                if (rules.length > 0) {
                    prereqs.extend(rules);
                } else {
                    throw new Error(`No rule ${verb} the "${type}" type, but another rule needs it as input.`);
                }
            }
        }

        const prereqs = new NiceSet();

        // Add finalized types:
        extendOrThrow(prereqs, this._typesFinalized(), type => ruleset.inwardRulesThatCouldEmit(type), 'emits');

        // Add mentioned types:
        // We could say this.lhs.typesMentioned().minus(typesFinalized) as an
        // optimization. But since types mentioned are a superset of types
        // finalized and rules adding are a subset of rules emitting, we get
        // the same result without.
        extendOrThrow(prereqs, this.lhs.typesMentioned(), type => ruleset.inwardRulesThatCouldAdd(type), 'adds');

        return prereqs;
    }

    /**
     * Return the types that this rule finalizes.
     *
     * To "finalize" a type means to make sure we're finished running all
     * possible rules that might change a node's score or notes w.r.t. a given
     * type. This is generally done because we're about to use those data for
     * something, like computing a new type's score or or an aggregate
     * function. Exhaustively, we're about to...
     * * change the type of the nodes or
     * * aggregate all nodes of a type
     *
     * This base-class implementation just returns what aggregate functions
     * need, since that need spans inward and outward rules.
     *
     * @return Set of types
     */
    _typesFinalized() {
        // Get the types that are fed to aggregate functions. Aggregate
        // functions are more demanding than a simple type() LHS. A type() LHS
        // itself does not finalize its nodes because the things it could do to
        // them without changing their type (adding notes, multiplying score)
        // are immutable or commutative (respectively). Thus, we require a RHS
        // type change in order to require finalization of a simple type()
        // mention. A max(B), OTOH, is not commutative with other B->B rules
        // (imagine type(B).max()->score(.5)), so it must depend on B emitters
        // and thus finalize B. (This will have to be relaxed or rethought when
        // we do the max()/atMost() optimization. Perhaps we can delegate to
        // aggregate functions up in Rule.prerequisites() to ask what their
        // prereqs are. If they implement such an optimization, they can reply.
        // Otherwise, we can assume they are all the nodes of their type.)
        //
        // TODO: Could arbitrary predicates (once we implement those) matter
        // too? Maybe it's not just aggregations.
        const type = this.lhs.aggregatedType();
        return (type === undefined) ? new NiceSet() : new NiceSet([type]);
    }
}

/**
 * A normal rule, whose results head back into the Fathom knowledgebase, to be
 * operated on by further rules.
 */
class InwardRule extends Rule {
    // TODO: On construct, complain about useless rules, like a dom() rule that
    // doesn't assign a type.

    /**
     * Return an iterable of the fnodes emitted by the RHS of this rule.
     * Side effect: update ruleset's store of fnodes, its accounting of which
     * rules are done executing, and its cache of results per type.
     */
    results(ruleset) {
        if (ruleset.doneRules.has(this)) {  // shouldn't happen
            throw new Error('A bug in Fathom caused results() to be called on an inward rule twice. That could cause redundant score multiplications, etc.');
        }
        const self = this;
        // For now, we consider most of what a LHS computes to be cheap, aside
        // from type() and type().max(), which are cached by their specialized
        // LHS subclasses.
        const leftFnodes = this.lhs.fnodes(ruleset);
        // Avoid returning a single fnode more than once. LHSs uniquify
        // themselves, but the RHS can change the element it's talking
        // about and thus end up with dupes.
        const returnedFnodes = new Set();

        // Merge facts into fnodes:
        wu.forEach(
            function updateFnode(leftFnode) {
                const leftType = self.lhs.guaranteedType();
                const fact = self.rhs.fact(leftFnode, leftType);
                self.lhs.checkFact(fact);
                const rightFnode = ruleset.fnodeForElement(fact.element || leftFnode.element);
                // If the RHS doesn't specify a type, default to the
                // type of the LHS, if any:
                const rightType = fact.type || self.lhs.guaranteedType();
                if (fact.conserveScore) {
                    // If conserving, multiply in the input-type score
                    // from the LHS node. (Never fall back to
                    // multiplying in the RHS-type score from the LHS:
                    // it's not guaranteed to be there, and even if it
                    // will ever be, the executor doesn't guarantee it
                    // has been filled in yet.)
                    if (leftType !== undefined) {
                        rightFnode.conserveScoreFrom(leftFnode, leftType, rightType);
                    } else {
                        throw new Error('conserveScore() was called in a rule whose left-hand side is a dom() selector and thus has no predictable type.');
                    }
                }
                if (fact.score !== undefined) {
                    if (rightType !== undefined) {
                        rightFnode.multiplyScoreFor(rightType, fact.score);
                    } else {
                        throw new Error(`The right-hand side of a rule specified a score (${fact.score}) with neither an explicit type nor one we could infer from the left-hand side.`);
                    }
                }
                if (fact.type !== undefined || fact.note !== undefined) {
                    // There's a reason to call setNoteFor.
                    if (rightType === undefined) {
                        throw new Error(`The right-hand side of a rule specified a note (${fact.note}) with neither an explicit type nor one we could infer from the left-hand side. Notes are per-type, per-node, so that's a problem.`);
                    } else {
                        rightFnode.setNoteFor(rightType, fact.note);
                    }
                }
                returnedFnodes.add(rightFnode);
            },
            leftFnodes);

        // Update ruleset lookup tables.
        // First, mark this rule as done:
        ruleset.doneRules.add(this);
        // Then, stick each fnode in typeCache under all applicable types.
        // Optimization: we really only need to loop over the types
        // this rule can possibly add.
        for (let fnode of returnedFnodes) {
            for (let type of fnode.typesSoFar()) {
                setDefault(ruleset.typeCache, type, () => new Set()).add(fnode);
            }
        }
        return returnedFnodes.values();
    }

    /**
     * Return a Set of the types that could be emitted back into the system.
     * To emit a type means to either to add it to a fnode emitted from the RHS
     * or to leave it on such a fnode where it already exists.
     */
    typesItCouldEmit() {
        const rhs = this.rhs.possibleEmissions();
        if (!rhs.couldChangeType && this.lhs.guaranteedType() !== undefined) {
            // It's a b -> b rule.
            return new Set([this.lhs.guaranteedType()]);
        } else if (rhs.possibleTypes.size > 0) {
            // We can prove the type emission from the RHS alone.
            return rhs.possibleTypes;
        } else {
            throw new Error('Could not determine the emitted type of a rule because its right-hand side calls props() without calling typeIn().');
        }
    }

    /**
     * Return a Set of types I could add to fnodes I output (where the fnodes
     * did not already have them).
     */
    typesItCouldAdd() {
        const ret = new Set(this.typesItCouldEmit());
        ret.delete(this.lhs.guaranteedType());
        return ret;
    }

    /**
     * Add the types we could change to the superclass's result.
     */
    _typesFinalized() {
        const self = this;
        function typesThatCouldChange() {
            const ret = new NiceSet();

            // Get types that could change:
            const emissions = self.rhs.possibleEmissions();
            if (emissions.couldChangeType) {
                // Get the possible guaranteed combinations of types on the LHS
                // (taking just this LHS into account). For each combo, if the RHS
                // adds a type that's not in the combo, the types in the combo get
                // unioned into ret.
                for (let combo of self.lhs.possibleTypeCombinations()) {
                    for (let rhsType of emissions.possibleTypes) {
                        if (!combo.has(rhsType)) {
                            ret.extend(combo);
                            break;
                        }
                    }
                }
            }
            // Optimization: the possible combos could be later expanded to be
            // informed by earlier rules which add the types mentioned in the LHS.
            // If the only way for something to get B is to have Q first, then we
            // can add Q to each combo and end up with fewer types finalized. Would
            // this imply the existence of a Q->B->Q cycle and thus be impossible?
            // Think about it. If we do this, we can centralize that logic here,
            // rather than repeating it in all the Lhs subclasses).
            return ret;
        }

        return typesThatCouldChange().extend(super._typesFinalized());
    }
}

/**
 * A rule whose RHS is an out(). This represents a final goal of a ruleset.
 * Its results go out into the world, not inward back into the Fathom
 * knowledgebase.
 */
class OutwardRule extends Rule {
    /**
     * Compute the whole thing, including any .through() and .allThrough().
     * Do not mark me done in ruleset.doneRules; out rules are never marked as
     * done so they can be requested many times without having to cache their
     * (potentially big, since they aren't necessarily fnodes?) results. (We
     * can add caching later if it proves beneficial.)
     */
    results(ruleset) {
        return this.rhs.allCallback(wu.map(this.rhs.callback, this.lhs.fnodes(ruleset)));
    }

    /**
     * @return the key under which the output of this rule will be available
     */
    key() {
        return this.rhs.key;
    }

    /**
     * OutwardRules finalize all types mentioned.
     */
    _typesFinalized() {
        return this.lhs.typesMentioned().extend(super._typesFinalized());
    }
}

export {
    InwardRule,
    OutwardRule,
    rule
};
