========
Training
========

Training is the process by which Fathom considers your rules against a labeled corpus of example pages (*samples*) and emits an ideal collection of parametrizing numbers which make recognition accurate. These comprise...

* *Coefficients* (one per rule), which encode the relative weights of each rule
* *Biases* (one per type), which center the resulting numerical range so the total score for a node is an accurate 0..1 confidence

Collecting Samples
==================

Use `FathomFox <https://addons.mozilla.org/en-US/firefox/addon/fathomfox/>`_ to collect samples. It has both a bulk collector and a page-at-a-time method integrated into Firefox's developer tools. See the documentation on its Add-Ons page for details.

The pages serialized by FathomFox will be large, on the order of 100-200MB each. So far, the best organizational approach we've found is to check them into git, along with the ruleset-containing trainees.js file from your fork of `fathom-trainees <https://github.com/mozilla/fathom-trainees>`_. (Hard linking from fathom-trainees to your sample repo is helpful.) Having your ruleset versioned along with your samples is invaluable for reproducing results and maintaining your sanity.

So far, a training corpus on the order of 50-100 samples has been sufficient to push validation accuracy above 99%. You'll want additional samples for a validation corpus (to let the trainer know when it's begun to overfit) and a test corpus (to come up with final accuracy numbers).

Designing Rules
===============

Each rule should generally express one machine-learning feature—or "smell", to coin a metaphor. The score it applies—the return value of the callback passed to :func:`score`—should be a number from 0 to 1, inclusive, representing the probability that that smell is present. These smells are later balanced by the trainer.

.. note::

   For many smells, it's natural to return hard 0s or 1s (or trues and falses, if that's more convenient). If you have fuzzier values to return—as from a rule that expresses something subjectively defined like "image is big"—:func:`linearScale` and :func:`sigmoid` will help you clamp down extreme values. Make the choice based on whether two adjacent extreme values should still have distinguishable outputs. If they should, go with sigmoid().

Sources of Signal
-----------------

What sorts of rules should you write? In short, ones that express simple, atomic smells that tend to be found in—or lacked by—target elements. For example, if you are trying to recognize the images of products for sale on shopping sites, the target image might have smells like...

* Large size
* Position near the top of the page
* Position near the left of the page
* IDs or class names that contain the strings "hero" or "product"

Don't worry about expressing boolean combinations of smells except as a last resort. It's generally sufficient to let Fathom optimize a linear combination of them. Also, Fathom will determine on its own whether to give a positive or negative weight to a smell; you don't need to tell it.

Since the primitives exposed by Fathom are thus far geared to the measurement of DOM properties (rather than, say, natural language processing), the best bang for your buck is generally rules that consider...

* CSS classes and IDs. Begin by simply testing for inclusion of signal-bearing strings. It is probably unnecessary to apply tokenization.
* Rendered size or position of elements
* Alignment or proximity of elements to each other. So far, the state of the art is to program a bit of "look around" into the scoring callback. It is also possible to get ahold of the :class:`BoundRuleset` object and try to pair up the examined node with another of a certain type, but so far it's a manual process.
* Font sizes
* Colors and borders
* Visibility
* Any of the above in :func:`ancestor<ancestors>` elements of the target

A useful technique is to look at some of the pages in your corpus and blur your eyes slightly. This shows you the page as Fathom sees it: you can't read the text, but you can likely still recognize the target elements. Write rules that express the smells you are using to do so.

Computed CSS properties are worth a special mention: `getComputedStyle() <https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle>`_ is the most robust way to retrieve style information about an element, since most properties are inherited through the complex interplay of stylesheets. Don't try to look at ``style`` attributes directly or otherwise painstakingly reason out styles.

Rules of Thumb
--------------

* Lots of simple rules are better than fewer, more complex ones. Not only are they easier to write, but the further you can break up your guesses into separately optimizable pieces, the more good the trainer can do.
* Your rules don't all have to be good. If you have an idea for a smell, code it up. If it was a bad idea, the trainer will give it a coefficient near 0, and you can prune it away.
* :func:`when()` is good for early pruning: hard, yes/no decisions on what should be considered. Scores are for gradations. Pruning makes your vector files smaller and training faster.
* Many good rule ideas come out of labeling samples. If you are not labeling samples yourself, at least study them in depth so you can notice patterns.
* Rubrics are vital for labeling. If samples are labeled inconsistently, they will push the trainer in conflicting directions, and your accuracy will suffer. Also, keep your rubrics up to date. Whenever you encounter a case where you have to make a new decision—something the rubric doesn't already clearly decide—edit the rubric to codify that decision so you are consistent with it in the future. Check your rubrics into version control.
* Include some samples that are missing the thing you're trying to recognize so your ruleset learns to avoid false positives.

Suggested Directory Structure
=============================

We've mentioned a number of items to check into version control. Here is a directory structure that works well:

.. code-block:: none

    runs/             -- TensorBoard data emitted by the trainer
    samples/
        negative/     -- Samples that do NOT contain what we're looking for
            n4.html
            n7.html
            n11.html
            ...
        positive/     -- Samples that DO contain what we're looking for
            3.html
            10.html
            14.html
        training/
            1.html
            n2.html
            5.html
            ...
        validation/
        testing/
        rubric.txt
        urls.csv      -- A mapping of sample numbers to URLs, in case we ever need them
    trainees.js       -- Ruleset code, symlinked into your fathom-trainees fork
    vectors/          -- Feature vectors from FathomFox's Vectorizer

A few notes:

* The negative examples' numerical IDs are in the same namespace as the positive ones, but we prefix them with an n. This is so that, when the trainer says it assumed a sample was negative because it had no labeled target elements, we can tell at a glance whether it was correct.
* Samples start in the ``positive`` and ``negative`` folders. From there, they should be divided among the training, validation, and testing ones using :command:`fathom-pick`, which randomly moves a given number of files from one directory to another.

Storing Large Corpora in Version Control
========================================

If you find that you need a large number of samples or your individual files are themselves over a certain size, you may bump up against the limits imposed by your hosting service. In this scenario, we recommend using `Git Large File Storage (LFS) <https://git-lfs.github.com/>`_ to store the files created by :command:`fathom-extract`.

Using fathom-extract
--------------------

:command:`fathom-extract` is a command line tool that pulls the inlined data URLs representing subresources (like images and CSS) out of your samples, converts them into images and CSS files, places them in a newly created sample-specific directory within a newly created resources directory, and replaces the data URLs with references to the new files. This greatly decreases the size of each HTML file and allows you to use Git-LFS to store the new subresource files.

For example, if you have this directory of samples: ::

    samples/
        negative/
            n4.html
            n7.html
            n11.html
            ...

Running... ::

    fathom-extract samples/negative

will change your directory to: ::

    samples/
        negative/
            resources/
                n4/
                    1.png
                    2.css
                    3.css
                    ...
                n7/
                    1.css
                    2.jpg
                    3.jpg
                    ...
                n11/
                    1.css
                    2.png
                    3.jpg
                    ...
                ...
            n4.html
            n7.html
            n11.html
            ...

Configuring Git-LFS
-------------------

With your extracted samples directory, you can follow the `Git-LFS Getting Started steps <https://git-lfs.github.com/>`_ to track your new resources directory. In step 2, instead of running the `git lfs track` command, you may find it easier to directly edit the `.gitattributes` file. For our resources directory, you would add the line: ::

    samples/**/resources/** filter=lfs diff=lfs merge=lfs -text

The first `/**` ensures all sample directories (`positive`, `negative`, `training`, etc) are tracked, and the second `/**` ensures the subdirectories are tracked.

Running the Trainer
===================

.. note::

   Fathom has had several trainers over its evolution. Both the Corpus Framework and the trainer built into old versions of FathomFox are obsoleted by :command:`fathom-train`, described herein.

Once your samples are collected and at least several rules are written, you're ready to do some initial training. Fathom's trainer is a commandline Python 3 program that can be installed, along with a few other utilities, by running... ::

    pip install fathom-web

Training is done for one type at a time. If you have types that depend on other types, train the other types first.

As the first step of the training loop, use FathomFox's Vectorizer to emit feature vectors for all your training samples. It's a good idea to check these JSON files into the same repository as your samples and ruleset code, for later reproducibility. If you have validation samples ready, vectorize them, too, into a separate file.

Next, invoke the trainer. Here is its online help, to give you a sense of its capabilities:

.. code-block:: none

    Usage: fathom-train [OPTIONS] TRAINING_FILE

      Compute optimal coefficients for a Fathom ruleset, based on a set of
      labeled pages exported by the FathomFox Vectorizer.

      To see graphs of the results, install TensorBoard, then run this:
      tensorboard --logdir runs/.

      Some vocab used in the output messages:

        target -- A "right answer" DOM node, one that should be recognized

        candidate -- Any node (target or not) brought into the ruleset, by a
        dom() call, for consideration

        negative sample -- A sample with no intended target nodes, used to bait
        the recognizer into a false-positive choice

    Options:
      -a FILENAME                A file of validation samples from FathomFox's
                                 Vectorizer, used to graph validation loss so you
                                 can see when you start to overfit
      -s, --stop-early           Stop 1 iteration before validation loss begins to
                                 rise, to avoid overfitting. Before using this,
                                 make sure validation loss is monotonically
                                 decreasing.
      -l, --learning-rate FLOAT  The learning rate to start from  [default: 1.0]
      -i, --iterations INTEGER   The number of training iterations to run through
                                 [default: 1000]
      -c, --comment TEXT         Additional comment to append to the Tensorboard
                                 run name, for display in the web UI
      -v, --verbose              Show additional diagnostics that may help with
                                 ruleset debugging
      --help                     Show this message and exit.

The simplest possible trainer invocation is... ::

    fathom-train initialTrainingVectors.json

...yielding something like...

.. code-block:: js

    Coeffs: [
            ['nextAnchorIsJavaScript', 1.1627885103225708],
            ['nextButtonTypeSubmit', 4.613410949707031],
            ['nextInputTypeSubmit', 4.374269008636475],
            ['nextInputTypeImage', 6.867544174194336],
            ['nextLoginAttrs', 0.07278082519769669],
            ['nextButtonContentContainsLogIn', -0.6560719609260559],
        ]
    Bias: -8.645608901977539
      Training accuracy per tag:  0.98312    95% CI: (0.97153, 0.99472)  FP: 0.000  FN: 0.017
    Validation accuracy per tag:  0.97143    95% CI: (0.95668, 0.98618)  FP: 0.000  FN: 0.029
      Training accuracy per page: 1.00000    95% CI: (1.00000, 1.00000)
    Validation accuracy per page: 0.96875    95% CI: (0.92612, 1.00000)

If you pass ``--verbose``, you will also get handy per-sample diagnostics.

Viewing the TensorBoard graphs with ``tensorboard --logdir runs/`` will quickly show you whether the loss function is oscillating. If you see oscilloscope-like wiggles rather than a smooth descent, the learning rate is too high: the trainer is taking steps that are too big and overshooting the optimum it's chasing. Decrease the learning rate by a factor of 10 until the graph becomes smooth::

    fathom-train initialTrainingVectors.json --learning-rate 0.1 -c tryingToRemoveOscillations

Comments (with ``-c``) are your friend, as a heap of anonymous TensorBoard runs otherwise quickly becomes indistinguishable.

.. note::

   Fathom currently uses the `Adam <https://en.wikipedia.org/wiki/Stochastic_gradient_descent#Adam>`_ optimization algorithm, which is good at tuning its own learning rates. Even if the loss graph oscillates at the start, it will eventually flatten out, given enough iterations. However, it's best to tamp down oscillations from the beginning so you can use validation-guided early stopping. Adam seems to dial in the learning rate quickly enough, as long as you get it within a power of 10.

   Incidentally, it's not the end of the world if some scores go slightly outside [0, 1]. Limited tests have gotten away with values up to about 10 without measurable harm to training speed or accuracy. However, when feature values differ in magnitude by a factor of 1000, annoying oscillations dominate early iterations. Stick to [0, 1] for a trouble-free experience.

Once you've tamped down oscillations, use validation samples and early stopping to keep Fathom from overfitting::

    fathom-train initialTrainingVectors.json -a initialValidationVectors.json --stop-early -c tryingEarlyStopping

Workflow
========

A sane authoring process is a feedback loop something like this:

1. Collect samples. Observe patterns in the :term:`target` nodes as you do.
2. Write a few rules based on your observations.
3. Run the trainer. Start with 10-20 training pages and an equal number of validation ones.
4. If accuracy is insufficient, examine the failing pages. FathomFox's Evaluator page is invaluable for this, as it will show you the element Fathom spuriously picked. Remediate by changing or adding rules. If there are smells Fathom is missing—positive or negative—add rules that score based on them.
5. Go to 3, making sure to re-vectorize if you have added or changed rules.
6. Once *validation accuracy* is sufficient, copy the coefficients into your ruleset, and use the :command:`fathom-test` tool on a fresh set of vectorized *testing* samples. This is your *testing accuracy* and should reflect real-world performance, assuming your sample size is large and representative enough. The computed 95% confidence intervals should help you decide the former.
7. If testing accuracy is too low, imbibe the testing pages into your training corpus, and go back to step 3. As typical in supervised learning systems, testing samples should be considered "burned" once they are measured against a single time, as otherwise you are effectively training against them. Samples are precious.
8. If testing accuracy is sufficient, you're done! Copy the ruleset and coefficients out of fathom-trainees into your finished product, and ship it.
