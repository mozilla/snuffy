var fs = require('fs');
const {staticDom} = require('./utils');

function productImageDocPairs() {
  return [
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/amazon/expected-image.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/amazon/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/craigslist/expected-image.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/craigslist/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/ebay/expected-image.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/ebay/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/etsy/expected-image.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/etsy/source.html', 'utf-8')
    ],
     [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/newegg/expected-image.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/newegg/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/uniqlo/expected-image.html', 'utf-8')),
     fs.readFileSync(__dirname + '/test/product_classification_test_data/uniqlo/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/h&m/expected-image.html', 'utf-8')),
     fs.readFileSync(__dirname + '/test/product_classification_test_data/h&m/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/barnes&noble/expected-image.html', 'utf-8')),
     fs.readFileSync(__dirname + '/test/product_classification_test_data/barnes&noble/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/bose/expected-image.html', 'utf-8')),
     fs.readFileSync(__dirname + '/test/product_classification_test_data/bose/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/target/expected-image.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/target/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/home_depot/expected-image.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/home_depot/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/swatch/expected-image.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/swatch/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/tesla/expected-image.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/tesla/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/stanford/expected-image.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/stanford/source.html', 'utf-8')
    ],
     [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/macys/expected-image.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/macys/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/tiffany/expected-image.html', 'utf-8')),
     fs.readFileSync(__dirname + '/test/product_classification_test_data/tiffany/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/lowes/expected-image.html', 'utf-8')),
     fs.readFileSync(__dirname + '/test/product_classification_test_data/lowes/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/godiva/expected-image.html', 'utf-8')),
     fs.readFileSync(__dirname + '/test/product_classification_test_data/godiva/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/microsoft/expected-image.html', 'utf-8')),
     fs.readFileSync(__dirname + '/test/product_classification_test_data/microsoft/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/sciencebob/expected-image.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/sciencebob/source.html', 'utf-8')
    ]
  ];
}
function productTitleDocPairs() {
  return [
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/amazon/expected-title.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/amazon/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/craigslist/expected-title.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/craigslist/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/ebay/expected-title.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/ebay/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/etsy/expected-title.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/etsy/source.html', 'utf-8')
    ],
     [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/newegg/expected-title.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/newegg/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/uniqlo/expected-title.html', 'utf-8')),
     fs.readFileSync(__dirname + '/test/product_classification_test_data/uniqlo/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/h&m/expected-title.html', 'utf-8')),
     fs.readFileSync(__dirname + '/test/product_classification_test_data/h&m/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/barnes&noble/expected-title.html', 'utf-8')),
     fs.readFileSync(__dirname + '/test/product_classification_test_data/barnes&noble/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/bose/expected-title.html', 'utf-8')),
     fs.readFileSync(__dirname + '/test/product_classification_test_data/bose/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/target/expected-title.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/target/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/home_depot/expected-title.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/home_depot/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/swatch/expected-title.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/swatch/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/tesla/expected-title.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/tesla/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/stanford/expected-title.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/stanford/source.html', 'utf-8')
    ],
     [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/macys/expected-title.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/macys/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/tiffany/expected-title.html', 'utf-8')),
     fs.readFileSync(__dirname + '/test/product_classification_test_data/tiffany/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/lowes/expected-title.html', 'utf-8')),
     fs.readFileSync(__dirname + '/test/product_classification_test_data/lowes/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/godiva/expected-title.html', 'utf-8')),
     fs.readFileSync(__dirname + '/test/product_classification_test_data/godiva/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/microsoft/expected-title.html', 'utf-8')),
     fs.readFileSync(__dirname + '/test/product_classification_test_data/microsoft/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/sciencebob/expected-title.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/sciencebob/source.html', 'utf-8')
    ]
  ];
}
function productPriceDocPairs() {
  return [
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/amazon/expected-price.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/amazon/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/craigslist/expected-price.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/craigslist/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/ebay/expected-price.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/ebay/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/etsy/expected-price.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/etsy/source.html', 'utf-8')
    ],
     [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/newegg/expected-price.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/newegg/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/uniqlo/expected-price.html', 'utf-8')),
     fs.readFileSync(__dirname + '/test/product_classification_test_data/uniqlo/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/h&m/expected-price.html', 'utf-8')),
     fs.readFileSync(__dirname + '/test/product_classification_test_data/h&m/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/barnes&noble/expected-price.html', 'utf-8')),
     fs.readFileSync(__dirname + '/test/product_classification_test_data/barnes&noble/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/bose/expected-price.html', 'utf-8')),
     fs.readFileSync(__dirname + '/test/product_classification_test_data/bose/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/target/expected-price.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/target/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/home_depot/expected-price.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/home_depot/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/swatch/expected-price.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/swatch/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/tesla/expected-price.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/tesla/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/stanford/expected-price.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/stanford/source.html', 'utf-8')
    ],
     [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/macys/expected-price.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/macys/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/tiffany/expected-price.html', 'utf-8')),
     fs.readFileSync(__dirname + '/test/product_classification_test_data/tiffany/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/lowes/expected-price.html', 'utf-8')),
     fs.readFileSync(__dirname + '/test/product_classification_test_data/lowes/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/godiva/expected-price.html', 'utf-8')),
     fs.readFileSync(__dirname + '/test/product_classification_test_data/godiva/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/microsoft/expected-price.html', 'utf-8')),
     fs.readFileSync(__dirname + '/test/product_classification_test_data/microsoft/source.html', 'utf-8')
    ],
    [staticDom(fs.readFileSync(__dirname + '/test/product_classification_test_data/sciencebob/expected-price.html', 'utf-8')),
      fs.readFileSync(__dirname + '/test/product_classification_test_data/sciencebob/source.html', 'utf-8')
    ]
  ];
}

module.exports = {
  productImageDocPairs,
  productTitleDocPairs,
  productPriceDocPairs
};
