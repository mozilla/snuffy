1.1.0 / 2016-06-27
==================

  * Bump version to 1.1.
    Add version history.
  * Merge for...const fix for Firefox compatibility.
  * Remove prefer-const rule due to Firefox for...of issue
  * Replace for const... with let for Firefox compat
    This is due to a bug in Firefox, see https://bugzilla.mozilla.org/show_bug.cgi?id=1094995
  * Optimize DistanceMatrix.numClusters().
    We call it with every cluster merge, so there's no sense scanning over all the keys every time.
    Also...
    * Have closest() throw an error if there aren't at least 2 clusters left.
    * Choose not to move the merge loop into DistanceMatrix. Leaving it outside provides a lot of power to callers: they can stop when there are a certain number of clusters, when clusters reach a certain size, when they span a certain distance, or whatever.
  * Add CI notifications to #fathom IRC channel.

1.0.0 / 2016-06-20
==================

  * Get ready to release 1.0.
    Jared is about to use it in production, so it's time! A breaking 2.0 will probably follow fairly soon.
  * Stop throwing strings.
  * Implement clustering. Close [#18](https://github.com/mozilla/fathom/issues/18).
    * Add a linting rule whose absence cost me a couple hours.
    * Relax the unused-vars linting rule to a warning. In this case, the linter makes the code worse, forcing us to either re-express in terms of forEach (slower), clutter up the code with ignore pragmas, or choose an uninformative name like _ and add it to the ignore list. *sigh* A mediocre linter is worse than no linter.
  * Move max() and identity() to utils.
    Factor out best() so we can write min() and others.
  * jsdom.jsdom → jsdom
  * readme typo
  * Improve docs.
  * Improve distance metric to take stride nodes into account.
    Intuitively, this is now a pretty solid metric. Any further changes will probably be driven by the needs of the clustering algorithm.
  * Stop using nonexistent "engine" metadatum.
  * Show that descents through similar tags are rated as shorter than through dissimilar ones.
  * Add basic tests for distance().
    I hadn't planned to commit it without tests. Oops.
    Also, rename tests with a "_tests" suffix so I can tell what I have open more easily and so they're more easily accessible with LaunchBar.
  * Migrate reusable pieces to a utils submodule.
    Remove `make debug` because fathom is no longer runnable. The runnable stuff migrated to tests. Run `make debugtest` to debug it.
    Name test files after the modules they test.
  * Scale paragraphish scores by link density.
    This is like Readability's link density computation, except we consider only a container's "own length" (that is inline length).
    * Capitalize tag names, because that's how browsers report them.
  * Tweak some names and style.
  * Merge in the first iteration of a Readability-like demo. Close [#16](https://github.com/mozilla/fathom/issues/16).
  * Junk lodash for wu.
    lodash's iteration functions don't support ES6 iterators yet. They're thinking about it (https://github.com/lodash/lodash/issues/737) but not too hard.
    I'm going to see if I can get max() and sum() into wu.
  * Get the first iteration of the Readability demo scoring things.
    Right now, it's just a simple score by Ps' and DIVs' inline length.
    * Implement isBlock().
    * Fix walk() to always return the original element.
    * Dodge unimplemented wholeText() method in jsdom.
  * Begin turning the sketch of a readability implementation into a running demo.
  * Call mocha directly from `make test`.
    Linting takes forever, and sometimes we don't want tests aborted just because the linter sees some temporarily dead code.
  * jsdom is used only for the tests.
    You can just as well pass us a browser's native DOM object.
  * Let a ranker function return nothing or a single object. Ref [#9](https://github.com/mozilla/fathom/issues/9).
    This doesn't do as much as I hoped to shorten ranker arrow functions, since you have to say => ({}) in ES6 rather than just => {}, but it helps a little with full-length ranker functions. Also, not requiring a return value is nice.
  * Bring readme up to date.
  * Rename scoreMultiplier to "score" for brevity. Close [#4](https://github.com/mozilla/fathom/issues/4).
  * TODOs are okay. They often call out unhandled corner cases to readers.
  * Add a max() yanker. Ref [#12](https://github.com/mozilla/fathom/issues/12).
  * Add a demo embodying the first of jkerim's simple rulesets. Ref [#12](https://github.com/mozilla/fathom/issues/12).
    His original ruleset: https://github.com/JaredKerim-Mozilla/fathom/blob/0e473db5d5c22fd6660f98b46e83f85d465a2e3a/fathom.js#L68-L71
    It's wordy and inefficient, but it's a start.
    Also, separate tests into actual tests and design-inspiring use cases so we don't obscure (minimal) tests with non-minimal stuff.
  * Merge pull request [#14](https://github.com/mozilla/fathom/issues/14) from pdehaan/travis-badge
    Add Travis-CI badge to README
  * Add Travis-CI badge to README
  * Merge pull request [#11](https://github.com/mozilla/fathom/issues/11) from pdehaan/yo-travis
    Add initial .travis.yml file
  * Ignore ESLint errors [for now] and add the no-warning-comments shame warning
  * Add npm lint as a pretest hook in package.json
  * Add initial .travis.yml file
  * Move away from `var`.
    My initial impression is this makes it easier to reason about the code. Block scope certainly decreases the amount of state you have to think about at any one time. There's no sense requiring functions or classes to be defined in specific orders, though; this isn't C, and they're still hoisted in ES6.
    And my favorite: we no longer need to do a bunch of declaration bookkeeping at the front of each function just to accurately reflect the language semantics. It's less work and terser. Accurate reflection of the semantics is ensured by no-use-before-define.
  * Ignore things like npm-debug.log.
  * Fill out package.json, largely from [#8](https://github.com/mozilla/fathom/issues/8).
    We might remove the makefile eventually if npm scripts show any advantage. For now, we just reverse the direction of the "test" reference so people can run the tests even if they don't have make. (They will have npm.) I'd reverse "lint" for consistency, but running it via "npm run lint" results in an awful lot of uninformative racket.
  * Use MDN's whitespace style for destructuring assignment.
  * Merge ES6 idiomaticnesses. Close [#10](https://github.com/mozilla/fathom/issues/10).
  * Tweaking ESLint rules and ES6ing some stuff
  * Correct errors eslint found.
    There's still some dead code in the tests, but it will be hooked into that pending testcase.
  * Switch to eslint. Close [#7](https://github.com/mozilla/fathom/issues/7).
    It finds errors jshint doesn't. Also, we now lint the tests as well.
  * Move Readability utility procedures to tests.
    If any of them end up generally useful, we'll move them back into the framework.
  * Pull up some notes into proper docs.
  * Move some docs to readme.
    fancyExample() became the 2nd test case.
  * Rename types to flavors, to avoid term overloading.
    "Flavor" is longer than "kind", but it has the advantage of a natural-sounding "flavored" adjective form.
  * Make make targets quiet.
    When I run my tests, I don't really care *how* they run. That just noises up the results.
  * Rename scribbles to notes. Close [#5](https://github.com/mozilla/fathom/issues/5).
  * Note that type-driven rule dispatch works, since the 2nd test passes.
  * Move a TODO to the issue tracker.
  * Alphabetize exports.
  * Correct getDefault()'s behavior for existing keys that === undefined.
  * Add debugtest make target so we can invoke the debugger during tests.
  * Make undefined score multipliers on DOM rules default to 1.
  * Apply the MPL.
    Of the 3 licenses Mozilla pre-approves (MIT, MPL, Apache 2), MPL is the most restrictive, giving us the option of loosening it later. Its main stipulation is that modifications to the fathom.js file must be open-sourced, which I don't think is unreasonable. Let's see if it discourages too many people from using Fathom.
  * Polish readme wording.
  * Add a readme.
  * Fix makefile to jibe with fathom.js rename. Remove "run" target.
    Now fathom is just a library; there's nothing to run. If you want to run some examples, try "make test".
  * Standardize on single quotes.
    The Mozilla style guide says nothing, so I'll go with singles because it's what I'm used to from Python's PEP 8.
  * Add a test harness, and turn the simple example into a test. Make fathom a proper module, and rename source file to "fathom.js".
  * Rank phase works!
    The simple example now runs and spits out the right answer.
    Also, linting is now useful, finding accidental globals.
  * Debug with a GUI rather than with node's built-in debugger.
    The GUI is a little behind--it doesn't know how to introspect Maps and such--but it's better than jumping in and out of repl mode all the time on the commandline.
  * Remove "make clean".
  * Rely on node 6's built-in ES6 support rather than using Babel.
    This makes it much easier to debug, rather than messing about with source maps and the dearth of tooling that supports them. We can restore Babel later if we want to run within Firefox.
    As a bonus, we don't need a build process anymore (for now).
    Note that V8 (and thus Node) doesn't yet support the ES6 import syntax.
  * Get it linting and not crashing on startup. Add debug target.
  * Add initial DOM fact, and implement resultsOf() and its children.
    * Add initial DOM fact to kick off the rule running process.
    * Let empty scribbles be undefined. Why not? They're defined entirely by the rules that lay them down, after all; we're not going to enumerate them or anything.
    * Implement resultsOf(), resultsOfDomRule(), and resultsOfTypedRule(). Move default fill-ins to those from score().
  * Reimplement score(), taking into account the new return shape of the rankers.
    "Should work" except that we need to bootstrap `nonterminals` by adding the dom tree.
  * Start sketching out design 3 for the rule engine, which takes into account the new return shape of rankers.
  * Track dirty rules. Despecialize DOM nodes. Hone data types.
    Committing before revising rule engine to match newly honed ranker() return shapes.
    * Realize we need to keep track of not dirty rules but dirty facts.
    * Stop making DOM-sourced nodes so special: now they begin to become just normal nodes with type "dom".
    * Get a tentative handle on what a ranker (the RHS of a rule) should return.
  * Add more of the rule engine: the ruleset, the knowledgebase.
    Add lots of notes on future possibilities in case I have to bug out in a hurry.
  * Start implementing the 2nd design of the rule engine. Write the "inline text" finders.
    It's in pieces all over the place atm, but you can see it start to take shape.
  * Introduce the concept of "own text". Explicitly separate rank and yank phases.
    "Own text" means a higher level div doesn't end up ranked higher than the p it contains. Every block-level container gets credit only for the text directly within it.
  * Clear away old ideas. Document the new a bit so onlookers can make some sense.
  * Commit score.js before deleting discarded ideas. Add jsdom.
    jsdom will treat us well enough for tests. Atm, I'm not planning to lean very hard on querySelectorAll(), so perf may not matter much.
  * Ignore node_modules.
  * Add jshint.
  * Runs and tests the ES6-to-ES-lesser pipeline. Does barely anything.
