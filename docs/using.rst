=========
Basic Use
=========

Where It Works
==============

Fathom is a JavaScript framework that works against the DOM API, so you can use it server-side with ``jsdom`` (which the test harness uses) or another implementation, or you can embed it in a browser and pass it a native DOM. You can also pass in a subtree of a DOM to operate on a partial page.

To use it in a `node.js <https://nodejs.org/en/>`_ project, add ``fathom-web`` to your package.json file as a dependency:

.. code-block:: js

   ...
   "dependencies": {
      "fathom-web": "^2.1.0"
   },
   ...

Run ``npm install`` to download any install Fathom, and then import the symbols you need:

.. code-block:: js

   const {rule, ruleset, dom, out, and, atMost, max, note, props, score, type, typeIn} = require('fathom-web');

All the public symbols, aside from the :doc:`utilities`, are in the top-level fathom-web package.

The Language
============

Think of Fathom as a tiny programming language that recognizes the significant parts of DOM trees by means of its programs, Fathom rulesets. A ruleset is an unordered bag of rules, each of which takes in DOM nodes and annotates them with scores, types, and notes to influence future rules. At the end of the chain of rules, out pop one or more pieces of output—typically high-scoring nodes of certain types—to inform the surrounding imperative program.

This simple ruleset finds DOM nodes that could contain a useful page title and scores them according to how likely that is:

.. code-block:: js

   const rules = ruleset([
           // Put all <title> tags in the bucket of candidate titles.
           rule(dom('title'), type('titley').score(1)),

           // Tag any OpenGraph meta tag as title-ish as well:
           rule(dom('meta[property="og:title"]'), type('titley').score(1)),

           // Take all title-ish candidates, and punish them to the degree they
           // contain navigational claptrap like colons or dashes. Compress the
           // number into the standard 0..1 range using a sigmoid function.
           rule(type('titley'), score(fnode => sigmoid(numberOfColonsOrDashes(fnode.element))), {name: 'colons'}),

           // Add a rule for title length, intuiting that very long titles may not
           // be titles at all. Again, limit the range to 0..1 using a sigmoid. The
           // resulting score means "the probability that the title is 'long'", for
           // some definition of "long" that the trainer will later determine by
           // adding a scaling coefficient.
           rule(type('titley'), score(fnode => sigmoid(fnode.element.innerText.length)), {name: 'length'}),

           // Offer the max-scoring title-ish node under the output key "title".
           // The score on that node will represent the probability, informed by a
           // corpus of training pages, that the node is, indeed, the proper page
           // title.
           rule(type('titley').max(), 'title')
       ],
       [['colons', -0.3606211543083191], ['length', -1.6875461339950562]],  // coefficients from training
       ['titley', 3.660104751586914]  // biases from training
   );

See below for a full definition of `type`, `score`, and the rest of the Fathom language.

Rules, Sides, and Flows
=======================

Fathom is a `dataflow language <https://en.wikipedia.org/wiki/Dataflow_programming>`_. Each rule is shaped like ``rule(left-hand side, right-hand side)``. The *left-hand side* (LHS) pulls in one or more DOM nodes as input: either ones that match a certain CSS selector (:func:`dom()`) or ones tagged with a certain type by other rules (:func:`type()`). The *right-hand side* (RHS) then decides what to do with those nodes:

* Adding a score. This is the most common action; it drives Fathom's recognition of entities.
* Assigning an additional type
* Scribbling a note on it. Notes let you avoid repeated computation and attach additional information to output nodes.
* Or some combination thereof

Envision the rule as a pipeline, with the DOM flowing in one end, nodes being picked and passed along to RHSs which twiddle them, and then finally falling out right side, where they might flow into other rules whose LHSs pick them up. It's a slithering sort of flow.

This rule, which takes in :term:`fnodes<fnode>` that have previously been identified as text containers and adds a word-count annotation... ::

    rule(type('textContainer'), type('countedWords').note(fnode => fnode.element.textContent.split(/\s+/).length))

...can be thought of as...

.. code-block:: none

    textContainer fnodes emitted        assign "countedWords" type
         from other rules          ->        and a word count        ->   changed nodes --\
                                                                                          |
     ____________________________________________________________________________________ /
    /
    |
    \->  other rules' LHSs         ->   ...                          ->   ...          -->  ...

Remember that Fathom's rulesets are unordered, so any rule's output can flow into any other rule, not just ones that happen to come lexically after it.

Scores and Training
===================

Once you've written a few scoring rules, it's time to run the trainer. This computes optimal weighting coefficients and biases for them, which let the ruleset compute accurate confidences when it is run. See the separate in-depth treatment of :doc:`training`.

Pulling Out Answers
===================

Once the ruleset is written and trained, you can run a DOM tree through it:

.. code-block:: js

   const JSDOM = require('jsdom').JSDOM;  // jsdom v10 and up
   const dom = new JSDOM("<html><head>...</html>").window.document;
   // Tell the ruleset which DOM to run against, yielding a factbase about the document:
   const facts = rules.against(dom);

After running a tree or subtree through, pull the answers out of the factbase: in this case, we want the note containing the max-scoring title, which the ruleset conveniently stores under the "title" output key:

.. code-block:: js

   const bestTitleFnode = facts.get('title');

A more developed ruleset would expose the title itself using :func:`through`. But in this case, you would pull it out manually using the :doc:`methods on fnodes<fnodes>`.

If the ruleset doesn't anticipate the output you want, you can ask for it more explicitly by passing a query, in the form of a full LHS, to :func:`~BoundRuleset.get`. For example, if you simply want all the title-ish things so you can do further computation on them...

.. code-block:: js

   const allTitleFnodes = facts.get(type('titley'));

Or if you have a reference to a DOM element from elsewhere in your program, you can look up the scores, types, and notes Fathom attached to it:

.. code-block:: js

   const fnode = facts.get(dom.getElementById('aTitle'));

.. warning::

    jsdom likes to load external resources, like CSS and JS, referenced from the HTML you feed it. This is, of course, slow, a security leak, and unhelpful for our purposes. This longer spelling will keep it from doing that::

        const {jsdom} = require('jsdom/lib/old-api');
        const dom = jsdom.jsdom("<html><head>...</html>",
                                {features: {ProcessExternalResources: false}});

    We're targeting jsdom version 10 and up here: particularly, its `old API <https://github.com/tmpvar/jsdom/blob/master/lib/old-api.md>`_, which is so far the only one that lets you control resource loading.
