const assert = require('chai').assert;

const {deviationScore, productDocPairs, tunedContentFnodes} = require('../examples/products');
const {staticDom} = require('../utils');


describe('Readability ruleset finds content from...', function () {
    this.timeout(0);  // This early in the dev process, some things still take awhile.

    // ---------------------- Test helper routines: -----------------------

    /**
     * Return a 20-char snippet of each node from a document's main
     * textual content.
     */
    function snippetsFrom(doc) {
        return tunedContentFnodes()(doc).map(fnode => fnode.element.textContent.trim().substr(0, 20).trim());
    }


    // ----------------------------- Tests: -------------------------------

    it.only('the Products test suite', function () {
        assert.isBelow(deviationScore(productDocPairs()), 100);
    });
});
