/**
 * An algorithm that extracts a product from a product page,
 * where a 'product' is defined by the bundle of features that
 * makes it identifiable.
 *
 * Features:
 *    Implemented/In Progress - Title, Image
 *    Near Future -  Price
 *    Farther Future - Reviews, Product ID?
 *
 * Testing:
 *    10 test products in product_classification_test_data folder
 *    See output in Karma DEBUG RUNNER at http://localhost:9876/debug.html JS console
 *    All test sources are product detail pages (one product on this page)
 *    Later, go on to extract products from a product index page (multiple products per page)
 *
 * Other:
 *    Identifying detail vs index page - classification problem?
 */

var fs = require('fs');
const {dirname} = require('path');
const leven = require('leven');
const {dom, props, out, rule, ruleset, score, type} = require('../index');
const {domSort, staticDom} = require('../utils');
const {Annealer} = require('../optimizers');



function euclideanDistance(nodeA, nodeB){

  /* getBoundingClientRect is relative to the viewport, should be fine for tests and demos
  but might need to be tweaked or replaced with a different call when integrated
  into a real-life browsing session, where the user might have scrolled */

  var rectA = nodeA.getBoundingClientRect();
  var rectB = nodeB.getBoundingClientRect();
  var x = rectB.left - rectA.left;
  var y = rectB.bottom - rectB.bottom;
  return Math.sqrt(x**2 + y**2);
}

function tunedImageFnodes() {
    function imageSize(fnode) {
      return fnode.element.offsetWidth * fnode.element.offsetHeight;
    }

    function imageHasSrc(fnode) {
      return fnode.element.hasAttribute('src') && fnode.element.getAttribute('src') !== '';
    }

    function imageTitle(fnode) {
      var title = document.getElementsByTagName('title')[1];
      if (title === undefined) {
        return 1;
      }

      if (fnode.element.getAttribute('title') &&
         (fnode.element.getAttribute('title').includes(title.innerHTML) || title.innerHTML.includes(fnode.element.getAttribute('title'))) ||
          fnode.element.getAttribute('alt') &&
         (fnode.element.getAttribute('alt').includes(title.innerHTML) || title.innerHTML.includes(fnode.element.getAttribute('alt')))) {
               return 10000;
      }
      return 1;
    }

    function thumbnail(fnode) {
      if(fnode.element.hasAttribute('src') && fnode.element.getAttribute('src').includes('thumb')){
        return 0;
      }
      return 1;
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

      //not to be confused with the thumbnail
      rule(type('images'), score(thumbnail)),

      //return image with max score
      rule(type('images').max(), out('main-image'))

    );

    function contentFnodes(doc) {
        return rules.against(doc).get('main-image');
    }

    return contentFnodes;
}

function tunedTitleFnodes() {
    const rules = ruleset(
      //get all title tags in the inserted fixture
      rule(dom('div#fixture > title'), type('titleish')),

      //return image with max score
      rule(type('titleish').max(), out('product-title'))

    );

    function contentFnodes(doc) {
        return rules.against(doc).get('product-title');
    }

    return contentFnodes;
}

/**
 * Maintain state as we compare a series of DOMs, reporting the percent
 * difference at the end.
 */
class DiffStats {
    constructor(contentFnodes, feature) {
        this.lengthOfExpectedTexts = 0;
        this.lengthOfDiffs = 0;
        if (feature === 'image') {
          this.contentFnodes = contentFnodes || tunedImageFnodes();
          this.feature = 'image';
        } else {
          this.contentFnodes = contentFnodes || tunedTitleFnodes();
          this.feature = 'title';
        }
    }

    compare(expectedDom, sourceDom) {
        var expectedText;
        var gotText;
        if (this.feature === 'image') {
          //compare images by src
          expectedText = expectedDom.body.firstChild.getAttribute('src');
          gotText = this.contentFnodes(sourceDom).map(fnode => fnode.element.getAttribute('src'))[0];
        } else {
          //compare innerHTML text of titles
          expectedText = expectedDom.head.firstChild.innerHTML;
          gotText = this.contentFnodes(sourceDom).map(fnode => fnode.element.innerHTML)[0];
        }

        this.lengthOfExpectedTexts++;
        if(expectedText !== gotText) {
          this.lengthOfDiffs++;
        }

        // Uncomment for debugging:
        console.log(leven(expectedText, gotText), expectedText.length, leven(expectedText, gotText)/expectedText.length);
        console.log('Got:\n' + gotText);
        console.log('\nExpected:\n' + expectedText);
    }

    score() {
        return this.lengthOfDiffs / this.lengthOfExpectedTexts * 100;
    }
}


function deviationScore(docPairs, feature, coeffs = []) {
    var stats;
    if(feature === 'image') {
      stats = new DiffStats(tunedImageFnodes(...coeffs), 'image');
    } else {
      stats = new DiffStats(tunedTitleFnodes(...coeffs), 'title');
    }

    for (let pair of docPairs) {
        window.document.body.insertAdjacentHTML('afterbegin', '<div id = "fixture">' + pair[1] + '</div>');
        stats.compare(pair[0], window.document);
        window.document.body.removeChild(document.getElementById('fixture'));
    }
    console.log(stats.score());
    return stats.score();
}

function productImageDocPairs() {
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
    [staticDom(fs.readFileSync(__dirname + '/../test/product_classification_test_data/uniqlo/expected-image.html', 'utf-8')),
     fs.readFileSync(__dirname + '/../test/product_classification_test_data/uniqlo/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/../test/product_classification_test_data/h&m/expected-image.html', 'utf-8')),
     fs.readFileSync(__dirname + '/../test/product_classification_test_data/h&m/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/../test/product_classification_test_data/barnes&noble/expected-image.html', 'utf-8')),
     fs.readFileSync(__dirname + '/../test/product_classification_test_data/barnes&noble/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/../test/product_classification_test_data/bose/expected-image.html', 'utf-8')),
     fs.readFileSync(__dirname + '/../test/product_classification_test_data/bose/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/../test/product_classification_test_data/target/expected-image.html', 'utf-8')),
      fs.readFileSync(__dirname + '/../test/product_classification_test_data/target/source.html', 'utf-8')
    ]
  ];
}
function productTitleDocPairs() {
  return [
    [staticDom(fs.readFileSync(__dirname + '/../test/product_classification_test_data/amazon/expected-title.html', 'utf-8')),
      fs.readFileSync(__dirname + '/../test/product_classification_test_data/amazon/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/../test/product_classification_test_data/craigslist/expected-title.html', 'utf-8')),
      fs.readFileSync(__dirname + '/../test/product_classification_test_data/craigslist/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/../test/product_classification_test_data/ebay/expected-title.html', 'utf-8')),
      fs.readFileSync(__dirname + '/../test/product_classification_test_data/ebay/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/../test/product_classification_test_data/etsy/expected-title.html', 'utf-8')),
      fs.readFileSync(__dirname + '/../test/product_classification_test_data/etsy/source.html', 'utf-8')
    ],
     [staticDom(fs.readFileSync(__dirname + '/../test/product_classification_test_data/newegg/expected-title.html', 'utf-8')),
      fs.readFileSync(__dirname + '/../test/product_classification_test_data/newegg/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/../test/product_classification_test_data/uniqlo/expected-title.html', 'utf-8')),
     fs.readFileSync(__dirname + '/../test/product_classification_test_data/uniqlo/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/../test/product_classification_test_data/h&m/expected-title.html', 'utf-8')),
     fs.readFileSync(__dirname + '/../test/product_classification_test_data/h&m/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/../test/product_classification_test_data/barnes&noble/expected-title.html', 'utf-8')),
     fs.readFileSync(__dirname + '/../test/product_classification_test_data/barnes&noble/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/../test/product_classification_test_data/bose/expected-title.html', 'utf-8')),
     fs.readFileSync(__dirname + '/../test/product_classification_test_data/bose/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/../test/product_classification_test_data/target/expected-title.html', 'utf-8')),
      fs.readFileSync(__dirname + '/../test/product_classification_test_data/target/source.html', 'utf-8')
    ]
  ];
}


if (require.main === module) {
    window.width = 1661;
    window.height = 562;
    console.log('% difference from ideal:', deviationScore(productImageDocPairs(), 'image'));
    console.log('% difference from ideal:', deviationScore(productTitleDocPairs(), 'title'));

}

module.exports = {
    deviationScore,
    productImageDocPairs,
    productTitleDocPairs,
    tunedImageFnodes
};
