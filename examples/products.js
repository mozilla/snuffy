var fs = require('fs');
const {dirname, join} = require('path');

const leven = require('leven');

const {dom, props, out, rule, ruleset, score, type} = require('../index');
const {domSort, inlineTextLength, linkDensity, staticDom} = require('../utils');
const files = ['amazon',
               'craigslist',
               'ebay',
               'etsy',
               'newegg',
               'target'
             ];

function tunedImageFnodes(coeffLinkDensity = 1.5, coeffParagraphTag = 4.5, coeffLength = 2, coeffDifferentDepth = 6.5, coeffDifferentTag = 2, coeffSameTag = 0.5, coeffStride = 0) {
    function imageSize(fnode) {
      return fnode.element.offsetWidth * fnode.element.offsetHeight;
    }

    const rules = ruleset(
      //get all images
      rule(dom('img'), type('images')),
      
      //better score for larger images
      rule(type('images'), score(imageSize)),

      //better score with smaller min distance to a header tag
      //rule(type('images'), score(distanceToHeader)),

      rule(type('images').max(), out('main-image'))

    );

    function contentFnodes(doc) {
        return rules.against(doc).get('main-image');
    }

    return contentFnodes;
}

/**
 * Maintain state as we compare a series of DOMs, reporting the percent
 * difference at the end.
 */
class DiffStats {
    constructor(contentFnodes) {
        this.lengthOfExpectedTexts = 0;
        this.lengthOfDiffs = 0;
        this.contentFnodes = contentFnodes || tunedImageFnodes();
    }

    compare(expectedDom, sourceDom) {
        const expectedText = expectedDom.documentElement.innerHTML;
        const gotText = '<head></head><body>' + this.contentFnodes(sourceDom).map(fnode => fnode.element.outerHTML)[0] + '\n</body>';

        this.lengthOfExpectedTexts += expectedText.length;
        this.lengthOfDiffs += leven(expectedText, gotText);

        console.log(leven(expectedText, gotText), expectedText.length, leven(expectedText, gotText)/expectedText.length);

        // Uncomment for debugging:
        console.log('Got:\n' + gotText);
        console.log('\nExpected:\n' + expectedText);
    }

    score() {
        return this.lengthOfDiffs / this.lengthOfExpectedTexts * 100;
    }
}


function deviationScore(docPairs, coeffs = []) {
    const stats = new DiffStats(tunedImageFnodes(...coeffs));
    for (let pair of docPairs) {
        window.document.body.insertAdjacentHTML('afterbegin', '<div id = "fixture">' + pair[1] + '</div>');
        stats.compare(pair[0], window.document);
        window.document.body.removeChild(document.getElementById('fixture'));
    }
    return stats.score();
}

/** Return (expected DOM, source DOM) for all the readbaility test docs. */
function productDocPairs() {
  return [
    [staticDom(fs.readFileSync(__dirname + '/../test/product_classification_test_data/amazon/expected-image.html', 'utf-8')),
      fs.readFileSync(__dirname + '/../test/product_classification_test_data/amazon/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/../test/product_classification_test_data/craigslist/expected-image.html', 'utf-8')),
      fs.readFileSync(__dirname + '/../test/product_classification_test_data/craigslist/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/../test/product_classification_test_data/ebay/expected-image.html', 'utf-8')),
      fs.readFileSync(__dirname + '/../test/product_classification_test_data/ebay/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/../test/product_classification_test_data/etsy/expected-image.html', 'utf-8')),
      fs.readFileSync(__dirname + '/../test/product_classification_test_data/etsy/source.html', 'utf-8')
    ],
     [staticDom(fs.readFileSync(__dirname + '/../test/product_classification_test_data/newegg/expected-image.html', 'utf-8')),
      fs.readFileSync(__dirname + '/../test/product_classification_test_data/newegg/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/../test/product_classification_test_data/target/expected-image.html', 'utf-8')),
      fs.readFileSync(__dirname + '/../test/product_classification_test_data/target/source.html', 'utf-8')
    ]
  ];
}

if (require.main === module) {
    let coeffs = [1.5, 4.5, 2, 6.5, 2, 0.5, 0];
    console.log('Tuned coefficients:', coeffs);
    console.log('% difference from ideal:',
      deviationScore(productDocPairs(), coeffs));

}

module.exports = {
    deviationScore,
    productDocPairs,
    tunedImageFnodes
};
