// The right-hand side of a rule

import {NiceSet, reversed} from './utilsForFrontend';


const TYPE = 1;
const NOTE = 2;
const SCORE = 4;
const ELEMENT = 8;
const CONSERVE_SCORE = 16;
const SUBFACTS = {
    type: TYPE,
    note: NOTE,
    score: SCORE,
    element: ELEMENT,
    conserveScore: CONSERVE_SCORE
};

/**
 * Expose the output of this rule's LHS as a "final result" to the surrounding
 * program. It will be available by calling :func:`~BoundRuleset.get` on the
 * ruleset and passing the key. You can run each node through a callback
 * function first by adding :func:`through()`, or you can run the entire set of
 * nodes through a callback function by adding :func:`allThrough()`.
 */
function out(key) {
    return new OutwardRhs(key);
}

class InwardRhs {
    constructor(calls = [], max = Infinity, types) {
        this._calls = calls.slice();
        this._max = max;  // max score
        this._types = new NiceSet(types);  // empty set if unconstrained
    }

    /**
     * Declare that the maximum returned score multiplier is such and such,
     * which helps the optimizer plan efficiently. This doesn't force it to be
     * true; it merely throws an error at runtime if it isn't. To lift an
     * ``atMost`` constraint, call ``atMost()`` (with no args). The reason
     * ``atMost`` and ``typeIn`` apply until explicitly cleared is so that, if
     * someone used them for safety reasons on a lexically distant rule you are
     * extending, you won't stomp on their constraint and break their
     * invariants accidentally.
     */
    atMost(score) {
        return new this.constructor(this._calls, score, this._types);
    }

    _checkAtMost(fact) {
        if (fact.score !== undefined && fact.score > this._max) {
            throw new Error(`Score of ${fact.score} exceeds the declared atMost(${this._max}).`);
        }
    }

    /**
      * Determine any of type, note, score, and element using a callback. This
      * overrides any previous call to `props` and, depending on what
      * properties of the callback's return value are filled out, may override
      * the effects of other previous calls as well.
      *
      * The callback should return...
      *
      * * An optional score multiplier
      * * A type (required on ``dom(...)`` rules, defaulting to the input one on
      *   ``type(...)`` rules)
      * * Optional notes
      * * An element, defaulting to the input one. Overriding the default
      *   enables a callback to walk around the tree and say things about nodes
      *   other than the input one.
      */
    props(callback) {
        function getSubfacts(fnode) {
            const subfacts = callback(fnode);
            // Filter the raw result down to okayed properties so callbacks
            // can't insert arbitrary keys (like conserveScore, which might
            // mess up the optimizer).
            for (let subfact in subfacts) {
                if (!SUBFACTS.hasOwnProperty(subfact) || !(SUBFACTS[subfact] & getSubfacts.possibleSubfacts)) {
                    // The ES5.1 spec says in 12.6.4 that it's fine to delete
                    // as we iterate.
                    delete subfacts[subfact];
                }
            }
            return subfacts;
        }
        // Thse are the subfacts this call could affect:
        getSubfacts.possibleSubfacts = TYPE | NOTE | SCORE | ELEMENT;
        getSubfacts.kind = 'props';
        return new this.constructor(this._calls.concat(getSubfacts),
                                    this._max,
                                    this._types);
    }

    /**
     * Set the type applied to fnodes processed by this RHS.
     */
    type(theType) {
        // In the future, we might also support providing a callback that receives
        // the fnode and returns a type. We couldn't reason based on these, but the
        // use would be rather a consise way to to override part of what a previous
        // .props() call provides.

        // Actually emit a given type.
        function getSubfacts() {
            return {type: theType};
        }
        getSubfacts.possibleSubfacts = TYPE;
        getSubfacts.type = theType;
        getSubfacts.kind = 'type';
        return new this.constructor(this._calls.concat(getSubfacts),
                                    this._max,
                                    this._types);
    }

    /**
     * Constrain this rule to emit 1 of a set of given types. Pass no args to lift
     * a previous ``typeIn`` constraint, as you might do when basing a LHS on a
     * common value to factor out repetition.
     *
     * ``typeIn`` is mostly a hint for the query planner when you're emitting types
     * dynamically from ``props`` calls—in fact, an error will be raised if
     * ``props`` is used without a ``typeIn`` or ``type`` to constrain it—but it
     * also checks conformance at runtime to ensure validity.
     */
    typeIn(...types) {
        // Rationale: If we used the spelling "type('a', 'b', ...)" instead of
        // this, one might expect type('a', 'b').type(fn) to have the latter
        // call override, while expecting type(fn).type('a', 'b') to keep both
        // in effect. Then different calls to type() don't consistently
        // override each other, and the rules get complicated. Plus you can't
        // inherit a type constraint and then sub in another type-returning
        // function that still gets the constraint applied.
        return new this.constructor(this._calls,
                                    this._max,
                                    types);
    }

    /**
     * Check a fact for conformance with any typeIn() call.
     *
     * @arg leftType the type of the LHS, which becomes my emitted type if the
     *    fact doesn't specify one
     */
    _checkTypeIn(result, leftType) {
        if (this._types.size > 0) {
            if (result.type === undefined) {
                if (!this._types.has(leftType)) {
                    throw new Error(`A right-hand side claimed, via typeIn(...) to emit one of the types ${this._types} but actually inherited ${leftType} from the left-hand side.`);
                }
            } else if (!this._types.has(result.type)) {
                throw new Error(`A right-hand side claimed, via typeIn(...) to emit one of the types ${this._types} but actually emitted ${result.type}.`);
            }
        }
    }

    /**
     * Whatever the callback returns (even ``undefined``) becomes the note of
     * the fact. This overrides any previous call to ``note``.
     */
    note(callback) {
        function getSubfacts(fnode) {
            return {note: callback(fnode)};
        }
        getSubfacts.possibleSubfacts = NOTE;
        getSubfacts.kind = 'note';
        return new this.constructor(this._calls.concat(getSubfacts),
                                    this._max,
                                    this._types);
    }

    /**
     * Multiply the score of the input node by some number, which can be >1 to
     * increase the score or <1 to decrease it (though negative scores are not
     * recommended due to constant sign-flipping).
     *
     * Since every node can have multiple, independent scores (one for each type),
     * this applies to the type explicitly set by the RHS or, if none, to the type
     * named by the ``type`` call on the LHS. If the LHS has none because it's a
     * ``dom(...)`` LHS, an error is raised.
     *
     * @arg {number|function} scoreOrCallback Can either be a static number or
     *     else a callback which takes the fnode and returns a number.
     */
    score(scoreOrCallback) {
        let getSubfacts;

        function getSubfactsFromNumber(fnode) {
            return {score: scoreOrCallback};
        }

        function getSubfactsFromFunction(fnode) {
            return {score: scoreOrCallback(fnode)};
        }

        if (typeof scoreOrCallback === 'number') {
            getSubfacts = getSubfactsFromNumber;
        } else {
            getSubfacts = getSubfactsFromFunction;
        }
        getSubfacts.possibleSubfacts = SCORE;
        getSubfacts.kind = 'score';

        return new this.constructor(this._calls.concat(getSubfacts),
                                    this._max,
                                    this._types);
    }

    /**
     * Base the scores this RHS applies on the scores of the input nodes rather
     * than starting over from 1.
     *
     * For now, there is no way to turn this back off (for example with a later
     * application of ``props`` or ``conserveScore(false)``).
     */
    conserveScore() {
        function getSubfacts(fnode) {
            return {conserveScore: true};
        }
        getSubfacts.possibleSubfacts = CONSERVE_SCORE;
        getSubfacts.kind = 'conserveScore';
        return new this.constructor(this._calls.concat(getSubfacts),
                                    this._max,
                                    this._types);
    }

    // Future: why not have an .element() method for completeness?

    // -------- Methods below this point are private to the framework. --------

    /**
     * Run all my props().type().note().score() stuff across a given fnode,
     * enforce my max() stuff, and return a fact ({element, type, score,
     * notes}) for incorporation into that fnode (or a different one, if
     * element is specified). Any of the 4 fact properties can be missing;
     * filling in defaults is a job for the caller.
     *
     * @arg leftType The type the LHS takes in
     */
    fact(fnode, leftType) {
        const doneKinds = new Set();
        const result = {};
        let haveSubfacts = 0;
        for (let call of reversed(this._calls)) {
            // If we've already called a call of this kind, then forget it.
            if (!doneKinds.has(call.kind)) {
                doneKinds.add(call.kind);

                if (~haveSubfacts & call.possibleSubfacts) {
                    // This call might provide a subfact we are missing.
                    const newSubfacts = call(fnode);
                    for (let subfact in newSubfacts) {
                        // A props() callback could insert arbitrary keys into
                        // the result, but it shouldn't matter, because nothing
                        // pays any attention to them.
                        if (!result.hasOwnProperty(subfact)) {
                            result[subfact] = newSubfacts[subfact];
                        }
                        haveSubfacts |= SUBFACTS[subfact];
                    }
                }
            }
        }
        this._checkAtMost(result);
        this._checkTypeIn(result, leftType);
        return result;
    }

    /**
     * Return a record describing the types I might emit (which means either to
     * add a type to a fnode or to output a fnode that already has that type).
     * {couldChangeType: whether I might add a type to the fnode,
     *  possibleTypes: If couldChangeType, the types I might emit; empty set if
     *      we cannot infer it. If not couldChangeType, undefined.}
     */
    possibleEmissions() {
        // If there is a typeIn() constraint or there is a type() call to the
        // right of all props() calls, we have a constraint. We hunt for the
        // tightest constraint we can find, favoring a type() call because it
        // gives us a single type but then falling back to a typeIn().
        let couldChangeType = false;
        for (let call of reversed(this._calls)) {
            if (call.kind === 'props') {
                couldChangeType = true;
                break;
            } else if (call.kind === 'type') {
                return {couldChangeType: true,
                        possibleTypes: new Set([call.type])};
            }
        }
        return {couldChangeType,
                possibleTypes: this._types};
    }
}

class OutwardRhs {
    constructor(key, through = x => x, allThrough = x => x) {
        this.key = key;
        this.callback = through;
        this.allCallback = allThrough;
    }

    /**
     * Append ``.through`` to :func:`out` to run each :term:`fnode` emitted
     * from the LHS through an arbitrary function before returning it to the
     * containing program. Example::
     *
     *     out('titleLengths').through(fnode => fnode.noteFor('title').length)
     */
    through(callback) {
        return new this.constructor(this.key, callback, this.allCallback);
    }

    /**
     * Append ``.allThrough`` to :func:`out` to run the entire iterable of
     * emitted :term:`fnodes<fnode>` through an arbitrary function before
     * returning them to the containing program. Example::
     *
     *     out('sortedTitles').allThrough(domSort)
     */
    allThrough(callback) {
        return new this.constructor(this.key, this.callback, callback);
    }

    asRhs() {
        return this;
    }
}

export {
    InwardRhs,
    out,
    OutwardRhs
};
