const assert = require('chai').assert;
const {deviationScore} = require('../examples/products/products');
const {productImageDocPairs, productTitleDocPairs, productPriceDocPairs} = require('../examples/products/docpairs');
const {Annealer} = require('../optimizers');



describe('Products ruleset finds content from...', function () {
    this.timeout(0);  // This early in the dev process, some things still take awhile.
    // ----------------------------- Tests: -------------------------------

    it('the Products test suite', function () {
        window.width = 1661;
        window.height = 562;

        // class ImageOptimizer extends Annealer {
        //     constructor() {
        //         super();
        //         const docPairs = productImageDocPairs();
        //         this.solutionCost = coeffs => deviationScore(docPairs, 'image', coeffs);
        //     }
        //
        //     randomTransition(solution) {
        //         // Nudge a random coefficient in a random direction.
        //         const ret = solution.slice();
        //         ret[Math.floor(Math.random() * solution.length)] += Math.floor(Math.random() * 2) ? -.5 : .5;
        //         return ret;
        //     }
        //
        //     initialSolution() {
        //         return [1000];
        //     }
        // }
        //
        // const imageOptimizer = new ImageOptimizer();
        // const coeffs = imageOptimizer.anneal();
        // console.log("OPTIMIZER COEFFS", coeffs);


        assert.isBelow(deviationScore(productImageDocPairs(), 'image'), 100);
        assert.isBelow(deviationScore(productTitleDocPairs(), 'title'), 100);
        assert.isBelow(deviationScore(productPriceDocPairs(), 'price'), 100);
    });
});
