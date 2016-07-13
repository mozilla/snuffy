# Fathom

[![Build Status](https://travis-ci.org/mozilla/fathom.svg?branch=master)](https://travis-ci.org/mozilla/fathom)
[![Coverage Status](https://coveralls.io/repos/github/mozilla/fathom/badge.svg?branch=master)](https://coveralls.io/github/mozilla/fathom?branch=master)

Find meaning in the web.

## Introduction

Fathom is an experimental framework for extracting meaning from web pages, identifying parts like Previous/Next buttons, address forms, and the main textual content. Essentially, it scores DOM nodes and extracts them based on conditions you specify. A Prolog-inspired system of types and annotations expresses dependencies between scoring steps and keeps state under control. It also provides the freedom to extend existing sets of scoring rules without editing them directly, so multiple third-party refinements can be mixed together.

## Why?

A study of existing projects like Readability and Distiller suggests that purely imperative approaches to semantic extraction get bogged down in the mechanics of DOM traversal and state accumulation, obscuring the operative parts of the extractors and making new ones long and tedious to write. They are also brittle due to the promiscuous profusion of state. Fathom is an exploration of whether we can make extractors simpler and more extensible by providing a declarative framework around these weak points. In short, Fathom handles tree-walking, execution order, and annotation bookkeeping so you don't have to.

Here are some specific areas we address:

* Browser-native DOM nodes are mostly immutable, and `HTMLElement.dataset` is string-typed, so storing arbitrary intermediate data on nodes is clumsy. Fathom addresses this by providing the fathom node (or **fnode**), a proxy around each DOM node which we can scribble on.
* With imperative extractors, any experiments or site-specific customizations must be hard-coded in. Fathom's rulesets, on the other hand, are unordered and therefore decoupled, stitched together only by the **flavors** they consume and emit. External rules can thus be plugged into existing rulesets, making it easy to experiment (without maintaining a fork) or to provide dedicated rules for particularly intractable web sites.
* Flavors provide a convenient way of tagging DOM nodes as belonging to certain categories, typically narrowing as the extractor's work progresses. A typical complex extractor would start by assigning a broad flavor to a set of candidate nodes, then fine-tune by examining them more closely and assigning additional, more specific flavors in a later rule.
* The flavor system also makes explicit the division between an extractor's public and private APIs: the flavors are public, and the imperative stuff that goes on inside ranker functions is private. Third-party rules can use the flavors as hook points to interpose themselves.
* Persistent state is cordoned off in flavored **notes** on fathom nodes. Thus, when a rule declares that it takes such-and-such a flavor as input, it can rightly assume there will be a note of that flavor on the fathom nodes that are passed in.

## Status

Fathom is under heavy development, and its design is still in flux. If you'd like to use it at such an early stage, you should remain in close contact with us.

### Parts that work so far

* "Rank" phase: scoring of nodes found with a CSS selector
* Flavor-driven rule dispatch
* A simple "yanker" or two
* A notion of DOM node distance influenced by structural similarity
* Clustering based on that distance metric

### Not there yet

* Concise rule definitions
* Global optimization for efficient execution

## Environments

Fathom works against the DOM API, so you can use it server-side with jsdom (which the test harness uses) or another implementation, or you can embed it in a browser and pass it a native DOM.

## Example

Fathom recognizes the significant parts of DOM trees. But what is significant? You decide, by providing a declarative set of rules. This simple one finds DOM nodes that could contain a useful page title and scores them according to how likely that is:

```javascript
var titleFinder = ruleset(
    // Give any title tag a score of 1, and tag it as title-ish:
    rule(dom("title"), node => [{score: 1, flavor: 'titley'}]),

    // Give any OpenGraph meta tag a score of 2, and tag it as title-ish as well:
    rule(dom("meta[og:title]"), node => [{score: 2, flavor: 'titley'}]),

    // Take all title-ish things, and punish them if they contain
    // navigational claptrap like colons or dashes:
    rule(flavor("titley"), node => [{score: containsColonsOrDashes(node.element) ? 2 : 1}])
);
```

Each rule is shaped like `rule(condition, ranker function)`. A **condition** specifies what the rule takes as input: at the moment, either nodes from the DOM tree that match a certain CSS selector (`dom(...)`) or else nodes tagged with a certain flavor by other rules (`flavor(...)`).

The **ranker function** is an imperative bit of code which decides what to do with a node: whether to scale its score, assign a flavor, make an annotation on it, or some combination thereof. A ranker returns a collection of 0 or more facts, each of which comprises...

* An optional score multiplier
* An element, defaulting to the input one. Overriding the default enables a ranker to walk around the tree and say things about nodes other than the input one.
* A flavor (required on dom() rules, defaulting to the input one on flavor() rules)
* Optional notes

For example...

```javascript
function someRanker(node) {
    return [{score: 3,
             element: node.element,  // unnecessary, since this is the default
             flavor: 'texty',
             notes: {suspicious: true}}];
}
```

Please pardon the verbosity of ranker functions; we're waiting for patterns to shake out before choosing syntactic sugar.

Once the ruleset is defined, run a DOM tree through it:

```javascript
// Run the rules above over a DOM tree, and return a knowledgebase of facts
// about nodes which can be queried in various ways. This is the "rank" phase
// of Fathom's 2-phase rank-and-yank algorithm.
var knowledgebase = titleFinder.score(jsdom.jsdom("<html><head>...</html>"));
```

Finally, "yank" out interesting nodes based on their flavors and scores. For example, we might look for the highest-scoring node of a given flavor, or we might look for a cluster of high-scoring nodes near each other.

## More Examples

Our docs are a little sparse so far, but [our tests](https://github.com/mozilla/fathom/tree/master/test) might help you in the meantime.

## Tests

To run the tests, run...

```
npm test
```

This will also run the linter and analyze test coverage. You can find the coverage report in the `coverage` directory and the HTML version under `coverage/lcov-report/index.html`.

If you're in the midst of a tornado of rapid development and the fancy stuff is too slow, you can invoke `make test` to run "just the tests, ma'am".

## Get Involved

Join us in IRC at #fathom on irc.mozilla.org.

## Version History

### 1.0
* Initial release

### 1.1
* Stop using `const` in `for...of` loops. This lets Fathom run within Firefox, which does not allow this due to a bug in its ES implementation.
* Optimize DistanceMatrix.numClusters(), which should make clustering a bit faster.

### 1.1.1
* No changes. Just bump the version in an attempt to get the npm index page to update.
