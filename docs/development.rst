===========
Development
===========

Tests and Examples
==================

`Our tests <https://github.com/mozilla/fathom/tree/master/test>`_, especially `demos.js <https://github.com/mozilla/fathom/blob/master/test/demos.js>`_, are replete with examples exercising every corner of Fathom.

To run the tests, run... ::

    make lint coverage

This will also run the linter and analyze test coverage. You can find the coverage report in the ``coverage`` directory and the HTML version under ``coverage/lcov-report/fathom/index.html``.

If you're in the midst of a tornado of rapid development and the fancy stuff is too slow, you can invoke ``make test`` to run "just the tests, ma'am".

And if you want to drop into the debugger in the middle of a test, add a ``debugger;`` statement at your desired breakpoint, then run ``make debugtest``.

Docs
====

To build the docs, first install jsdoc and Sphinx::

    npm install jsdoc
    pip install 'sphinx-js>=1.3,<2.0' sphinx_rtd_theme

You may also have to mess with your ``$PATH`` so Sphinx can find jsdoc. Then, go into the docs dir, and build them::

    cd docs
    make html
