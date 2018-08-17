import {assert} from 'chai';

import {deviationScore, readabilityDocPairs, tunedContentFnodes} from '../examples/readability';
import {staticDom} from '../utils';


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

    it('large inner clusters with some piddly little text in their container', function () {
        // Feel free to change what you want out of this, but this exists
        // to show that we thought it a sane output at one point.
        // distance() considers inner things almost infinitely far from
        // outer so we end up with either-or: generally just the outer,
        // which are often more plentiful. We then get the inner by means
        // of having their containers.
        const doc = staticDom(`
            <div>
                Smoo bars.
                <p>
                    One <code>fish</code>
                </p>
                <p>
                    Two <code>fish</code>
                </p>
                <p>
                    Three
                </p>
                Yo.
            </div>
        `);
        assert.deepEqual(snippetsFrom(doc),
                         ['One fish', 'Two fish', 'Three']);
    });

    it('large outer clusters with some piddly inner things contained', function () {
        // For instance, if the inner things were <code> blocks and the
        // outer were <p>s, we'd want the <p>s.
        const doc = staticDom(`
            <div>
                Smoo bars.
                <p>
                    One
                </p>
                <p>
                    Two
                </p>
                <p>
                    Three
                </p>
                Yo.
            </div>
            <div>
                Mangaroo. Witches and kangaroo.
            </div>
            <div>
                Bing bang, I saw the whole mang.
            </div>
        `);
        assert.deepEqual(snippetsFrom(doc),
                         ['Smoo bars.', 'Mangaroo. Witches an', 'Bing bang, I saw the']);
    });

    it('the Readability test suite', function () {
        // We keep dropping this as we get better, to prevent regressions:
        assert.isBelow(deviationScore(readabilityDocPairs()), 7.1);
    });
});

// Right now, I'm writing features and using optimization algos to find their coefficients. Someday, we can stop writing features and have deep learning come up with them. TODO: Grok unsupervised learning, and apply it to OpenCrawl.
