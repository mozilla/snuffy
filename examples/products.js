var fs = require('fs');
const {dirname, join} = require('path');

const leven = require('leven');

const {dom, props, out, rule, ruleset, score, type} = require('../index');
const {domSort, inlineTextLength, linkDensity, staticDom} = require('../utils');
const {Annealer} = require('../optimizers');


function euclideanDistance(nodeA, nodeB){
  var rectA = nodeA.getBoundingClientRect();
  var rectB = nodeB.getBoundingClientRect();
  var x = rectB.left - rectA.left;
  var y = rectB.bottom - rectB.bottom;
  return Math.sqrt(x^2 + y^2);
}

function tunedImageFnodes() {
    function imageSize(fnode) {
      return fnode.element.offsetWidth * fnode.element.offsetHeight;
    }

    function imageHasSrc(fnode){
      return fnode.element.hasAttribute('src') && fnode.element.getAttribute('src') != '';
    }

    function imageTitle(fnode){
      var title = document.getElementsByTagName('title')[1];
      if(title === undefined){
        return 0;
      }

      // return fnode.element.getAttribute('title') &&
      //        (fnode.element.getAttribute('title').includes(title.innerHTML) || title.innerHTML.includes(fnode.element.getAttribute('title'))) ||
      //        fnode.element.getAttribute('alt') &&
      //        (fnode.element.getAttribute('alt').includes(title.innerHTML) || title.innerHTML.includes(fnode.element.getAttribute('alt')));
      if (fnode.element.getAttribute('title') &&
             (fnode.element.getAttribute('title').includes(title.innerHTML) || title.innerHTML.includes(fnode.element.getAttribute('title'))) ||
             fnode.element.getAttribute('alt') &&
             (fnode.element.getAttribute('alt').includes(title.innerHTML) || title.innerHTML.includes(fnode.element.getAttribute('alt')))){
               return 10000;
             };
    }

    const rules = ruleset(
      //get all images
      rule(dom('img'), type('images')),

      //better score for larger images
      rule(type('images'), score(imageSize)),

      //make sure image has src
      rule(type('images'), score(imageHasSrc)),

      //image title matches page title
      rule(type('images'), score(imageTitle)),

      //return image with max score
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
        //compare images by src
        const expectedText = expectedDom.body.firstChild.getAttribute('src');
        const gotText = this.contentFnodes(sourceDom).map(fnode => fnode.element.getAttribute('src'))[0];

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
    window.width = 1661;
    window.height = 562;
    for (let pair of docPairs) {
        window.document.body.insertAdjacentHTML('afterbegin', '<div id = "fixture">' + pair[1] + '</div>');
        if(document.getElementsByTagName('title')[1] !== undefined){
          console.log(document.getElementsByTagName('title')[1].innerHTML);
        }
        stats.compare(pair[0], window.document);
        window.document.body.removeChild(document.getElementById('fixture'));
    }
    console.log(stats.score());
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
