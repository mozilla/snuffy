const assert = require('chai').assert;
const {deviationScore, productImageDocPairs, productTitleDocPairs} = require('../examples/products');



describe('Products ruleset finds content from...', function () {
    this.timeout(0);  // This early in the dev process, some things still take awhile.
    // ----------------------------- Tests: -------------------------------

    it('the Products test suite', function () {
        assert.isBelow(deviationScore(productImageDocPairs(), 'image'), 100);
        assert.isBelow(deviationScore(productTitleDocPairs(), 'title'), 100);
    });
});
