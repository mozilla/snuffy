/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

const {forEach} = require('wu');
const {max} = require('./utils');


// Get a key of a map, first setting it to a default value if it's missing.
function getDefault(map, key, defaultMaker) {
    if (map.has(key)) {
        return map.get(key);
    }
    const defaultValue = defaultMaker();
    map.set(key, defaultValue);
    return defaultValue;
}


// Construct a filtration network of rules.
function ruleset(...rules) {
    const rulesByInputFlavor = new Map();  // [someInputFlavor: [rule, ...]]

    // File each rule under its input flavor:
    forEach(rule => getDefault(rulesByInputFlavor, rule.source.inputFlavor, () => []).push(rule),
            rules);

    return {
        // Iterate over a DOM tree or subtree, building up a knowledgebase, a
        // data structure holding scores and annotations for interesting
        // elements. Return the knowledgebase.
        //
        // This is the "rank" portion of the rank-and-yank algorithm.
        score: function (tree) {
            const kb = knowledgebase();

            // Introduce the whole DOM into the KB as flavor 'dom' to get
            // things started:
            const nonterminals = [[{tree}, 'dom']];  // [[node, flavor], [node, flavor], ...]

            // While there are new facts, run the applicable rules over them to
            // generate even newer facts. Repeat until everything's fully
            // digested. Rules run in no particular guaranteed order.
            while (nonterminals.length) {
                const [inNode, inFlavor] = nonterminals.pop();
                for (let rule of getDefault(rulesByInputFlavor, inFlavor, () => [])) {
                    const outFacts = resultsOf(rule, inNode, inFlavor, kb);
                    for (let fact of outFacts) {
                        const outNode = kb.nodeForElement(fact.element);

                        // No matter whether or not this flavor has been
                        // emitted before for this node, we multiply the score.
                        // We want to be able to add rules that refine the
                        // scoring of a node, without having to rewire the path
                        // of flavors that winds through the ruleset.
                        //
                        // 1 score per Node is plenty. That simplifies our
                        // data, our rankers, our flavor system (since we don't
                        // need to represent score axes), and our engine. If
                        // somebody wants more score axes, they can fake it
                        // themselves with notes, thus paying only for what
                        // they eat. (We can even provide functions that help
                        // with that.) Most rulesets will probably be concerned
                        // with scoring only 1 thing at a time anyway. So,
                        // rankers return a score multiplier + 0 or more new
                        // flavors with optional notes. Facts can never be
                        // deleted from the KB by rankers (or order would start
                        // to matter); after all, they're *facts*.
                        outNode.score *= fact.score;

                        // Add a new annotation to a node--but only if there
                        // wasn't already one of the given flavor already
                        // there; otherwise there's no point.
                        //
                        // You might argue that we might want to modify an
                        // existing note here, but that would be a bad
                        // idea. Notes of a given flavor should be
                        // considered immutable once laid down. Otherwise, the
                        // order of execution of same-flavored rules could
                        // matter, hurting pluggability. Emit a new flavor and
                        // a new note if you want to do that.
                        //
                        // Also, choosing not to add a new fact to nonterminals
                        // when we're not adding a new flavor saves the work of
                        // running the rules against it, which would be
                        // entirely redundant and perform no new work (unless
                        // the rankers were nondeterministic, but don't do
                        // that).
                        if (!outNode.flavors.has(fact.flavor)) {
                            outNode.flavors.set(fact.flavor, fact.notes);
                            kb.indexNodeByFlavor(outNode, fact.flavor);  // TODO: better encapsulation rather than indexing explicitly
                            nonterminals.push([outNode, fact.flavor]);
                        }
                    }
                }
            }
            return kb;
        }
    };
}


// Construct a container for storing and querying facts, where a fact has a
// flavor (used to dispatch further rules upon), a corresponding DOM element, a
// score, and some other arbitrary notes opaque to fathom.
function knowledgebase() {
    const nodesByFlavor = new Map();  // Map{'texty' -> [NodeA],
                                      //     'spiffy' -> [NodeA, NodeB]}
                                      // NodeA = {element: <someElement>,
                                      //
                                      //          // Global nodewide score. Add
                                      //          // custom ones with notes if
                                      //          // you want.
                                      //          score: 8,
                                      //
                                      //          // Flavors is a map of flavor names to notes:
                                      //          flavors: Map{'texty' -> {ownText: 'blah',
                                      //                                   someOtherNote: 'foo',
                                      //                                   someCustomScore: 10},
                                      //                       // This is an empty note:
                                      //                       'fluffy' -> undefined}}
    const nodesByElement = new Map();

    return {
        // Return the "node" (our own data structure that we control) that
        // corresponds to a given DOM element, creating one if necessary.
        nodeForElement: function (element) {
            return getDefault(nodesByElement,
                              element,
                              () => ({element,
                                      score: 1,
                                      flavors: new Map()}));
        },

        // Return the highest-scored node of the given flavor, undefined if
        // there is none.
        max: function (flavor) {
            const nodes = nodesByFlavor.get(flavor);
            return nodes === undefined ? undefined : max(nodes, node => node.score);
        },

        // Let the KB know that a new flavor has been added to an element.
        indexNodeByFlavor: function (node, flavor) {
            getDefault(nodesByFlavor, flavor, () => []).push(node);
        },

        nodesOfFlavor: function (flavor) {
            return getDefault(nodesByFlavor, flavor, () => []);
        }
    };
}


// Apply a rule (as returned by a call to rule()) to a fact, and return the
// new facts that result.
function resultsOf(rule, node, flavor, kb) {
    // If more types of rule pop up someday, do fancier dispatching here.
    return rule.source.flavor === 'flavor' ? resultsOfFlavorRule(rule, node, flavor) : resultsOfDomRule(rule, node, kb);
}


// Pull the DOM tree off the special property of the root "dom" fact, and query
// against it.
function *resultsOfDomRule(rule, specialDomNode, kb) {
    // Use the special "tree" property of the special starting node:
    const matches = specialDomNode.tree.querySelectorAll(rule.source.selector);

    for (let i = 0; i < matches.length; i++) {  // matches is a NodeList, which doesn't conform to iterator protocol
        const element = matches[i];
        const newFacts = explicitFacts(rule.ranker(kb.nodeForElement(element)));
        for (let fact of newFacts) {
            if (fact.element === undefined) {
                fact.element = element;
            }
            if (fact.flavor === undefined) {
                throw new Error('Rankers of dom() rules must return a flavor in each fact. Otherwise, there is no way for that fact to be used later.');
            }
            yield fact;
        }
    }
}


function *resultsOfFlavorRule(rule, node, flavor) {
    const newFacts = explicitFacts(rule.ranker(node));

    for (let fact of newFacts) {
        // If the ranker didn't specify a different element, assume it's
        // talking about the one we passed in:
        if (fact.element === undefined) {
            fact.element = node.element;
        }
        if (fact.flavor === undefined) {
            fact.flavor = flavor;
        }
        yield fact;
    }
}


// Take the possibly abbreviated output of a ranker function, and make it
// explicitly an iterable with a defined score.
//
// Rankers can return undefined, which means "no facts", a single fact, or an
// array of facts.
function *explicitFacts(rankerResult) {
    const array = (rankerResult === undefined) ? [] : (Array.isArray(rankerResult) ? rankerResult : [rankerResult]);
    for (let fact of array) {
        if (fact.score === undefined) {
            fact.score = 1;
        }
        yield fact;
    }
}


// TODO: For the moment, a lot of responsibility is on the rankers to return a
// pretty big data structure of up to 4 properties. This is a bit verbose for
// an arrow function (as I hope we can use most of the time) and the usual case
// will probably be returning just a score multiplier. Make that case more
// concise.

// TODO: It is likely that rankers should receive the notes of their input type
// as a 2nd arg, for brevity.


// Return a condition that uses a DOM selector to find its matches from the
// original DOM tree.
//
// For consistency, Nodes will still be delivered to the transformers, but
// they'll have empty flavors and score = 1.
//
// Condition constructors like dom() and flavor() build stupid, introspectable
// objects that the query engine can read. They don't actually do the query
// themselves. That way, the query planner can be smarter than them, figuring
// out which indices to use based on all of them. (We'll probably keep a heap
// by each dimension's score and a hash by flavor name, for starters.) Someday,
// fancy things like this may be possible: rule(and(tag('p'), klass('snork')),
// ...)
function dom(selector) {
    return {
        flavor: 'dom',
        inputFlavor: 'dom',
        selector
    };
}


// Return a condition that discriminates on nodes of the knowledgebase by flavor.
function flavor(inputFlavor) {
    return {
        flavor: 'flavor',
        inputFlavor
    };
}


function rule(source, ranker) {
    return {
        source,
        ranker
    };
}


module.exports = {
    dom,
    rule,
    ruleset,
    flavor
};


// TODO: Integrate jkerim's static-scored, short-circuiting rules into the design. We can make rankers more introspectable. Rankers become hashes. If you return a static score for all matches, just stick an int in there like {score: 5}. Then the ruleset can be smart enough to run the rules emitting a given type in order of decreasing possible score. (Dynamically scored rules will always be run.) Of course, we'll also have to declare what types a rule can emit: {emits: ['titley']}. Move to a more declarative ranker also moves us closer to a machine-learning-based rule deriver (or at least tuner).


// Future possible fanciness:
// * Metarules, e.g. specific rules for YouTube if it's extremely weird. Maybe they can just take simple predicates over the DOM: metarule(dom => !isEmpty(dom.querySelectorAll('body[youtube]')), rule(...)). Maybe they'll have to be worse: the result of a full rank-and-yank process themselves. Or maybe we can somehow implement them without having to have a special "meta" kind of rule at all.
// * Different kinds of "mixing" than just multiplication, though this makes us care even more that rules execute in order and in series. An alternative may be to have rankers lay down the component numbers and a yanker do the fancier math.
// * Fancy combinators for rule sources, along with something like a Rete tree for more efficiently dispatching them. For example, rule(and(flavor('foo'), flavor('bar')), ...) would match only a node having both the foo and bar flavors.
// * If a ranker returns 0 (i.e. this thing has no chance of being in the category that I'm thinking about), delete the fact from the KB: a performance optimization.
// * I'm not sure about constraining us to execute the rules in order. It hurts efficiency and is going to lead us into a monkeypatching nightmare as third parties contribute rules. What if we instead used subflavors to order where necessary, where a subflavor is "(explicit-flavor, rule that touched me, rule that touched me next, ...)". A second approach: Ordinarily, if we were trying to order rules, we'd have them operate on different flavors, each rule spitting out a fact of a new flavor and the next rule taking it as input. Inserting a third-party rule into a ruleset like that would require rewriting the whole thing to interpose a new flavor. But what if we instead did something like declaring dependencies on certain rules but without mentioning them (in case the set of rules in the ruleset changes later). This draws a clear line between the ruleset's private implementation and its public, hookable API. Think: why would 3rd-party rule B want to fire between A and C? Because it requires some data A lays down and wants to muck with it before C uses it as input. That data would be part of facts of a certain flavor (if the ruleset designer is competent), and rules that want to hook in could specify where in terms of "I want to fire right after facts of flavor FOO are made." They can then mess with the fact before C sees it.
// * We could even defer actually multiplying the ranks together, preserving the individual factors, in case we can get any interesting results out of comparing the results with and without certain rules' effects.
// * Probably fact flavors and the score axes should be separate: fact flavors state what flavor of notes are available about nodes (and might affect rule order if they want to use each other's notes). Score axes talk about the degree to which a node is in a category. Each fact would be linked to a proxy for a DOM node, and all scores would live on those proxies.
// * It probably could use a declarative yanking system to go with the ranking one: the "reduce" to its "map". We may want to implement a few imperatively first, though, and see what patterns shake out.

// Yankers:
// max score (of some flavor)
// max-scored sibling cluster (maybe a contiguous span of containers around high-scoring ones, like a blur algo allowing occasional flecks of low-scoring noise)
// adjacent max-scored sibling clusters (like for Readability's remove-extra-paragraphs test, which has 2 divs, each containing <p>s)
//
// Yanking:
// * Block-level containers at the smallest. (Any smaller, and you're pulling out parts of paragraphs, not entire paragraphs.) mergedInnerTextNakedOrInInInlineTags might make this superfluous.
//
//
// Advantages over readability:
// * State clearly contained
// * Should work fine with ideographic languages and others that lack space-delimited words
// * Pluggable
// * Potential to have rules generated or tuned by training
// * Adaptable to find things other than the main body text
// * Potential to perform better since it doesn't have to run over and over, loosening constraints each time, if it fails
