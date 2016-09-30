// Tests for fathom/utils.js

const {assert} = require('chai');
const {jsdom} = require('jsdom');

const {distance, clusters} = require('../utils');


// Assert that the distance between nodes a and b is greater in the `deep` DOM
// tree than in the `shallow` one.
function assertFarther(deep, shallow) {
    assert.isAbove(distance(deep.getElementById('a'),
                            deep.getElementById('b')),
                   distance(shallow.getElementById('a'),
                            shallow.getElementById('b')));
}


describe('Utils tests', function() {
    describe('distance()', function() {
        // If we keep these tests unbrittle enough, we can use them as a
        // fitness function to search for optimal values of cost coefficients.

        it('considers a node 0 distance from itself', function () {
            const doc = jsdom(`
                <body>
                    <div id="a">
                    </div>
                </body>
            `);
            assert.equal(distance(doc.getElementById('a'),
                                  doc.getElementById('a')),
                         0);
        });

        it('considers deeper nodes farther than shallower', function () {
            const shallow = jsdom(`
                <body>
                    <div>
                        <div id="a">
                        </div>
                    </div>
                    <div>
                        <div id="b">
                        </div>
                    </div>
                </body>
            `);
            const deep = jsdom(`
                <body>
                    <div>
                        <div>
                            <div id="a">
                            </div>
                        </div>
                    </div>
                    <div>
                        <div>
                            <div id="b">
                            </div>
                        </div>
                    </div>
                </body>
            `);
            assertFarther(deep, shallow);
        });

        it("doesn't crash over different-lengthed subtrees", function () {
            const doc = jsdom(`
                <body>
                    <div>
                        <div>
                            <div id="a">
                            </div>
                        </div>
                    </div>
                    <div>
                        <div id="b">
                        </div>
                    </div>
                </body>
            `);
            distance(doc.getElementById('a'),
                     doc.getElementById('b'));
        });

        it('rates descents through similar tags as shorter', function () {
            const dissimilar = jsdom(`
                <body>
                    <center>
                        <div id="a">
                        </div>
                    </center>
                    <div>
                        <div id="b">
                        </div>
                    </div>
                </body>
            `);
            const similar = jsdom(`
                <body>
                    <div>
                        <div id="a">
                        </div>
                    </div>
                    <div>
                        <div id="b">
                        </div>
                    </div>
                </body>
            `);
            assertFarther(dissimilar, similar);
        });

        it('punishes the existence of stride nodes', function () {
            const noStride = jsdom(`
                <body>
                    <div>
                        <div id="a">
                        </div>
                    </div>
                    <div>
                        <div id="b">
                        </div>
                    </div>
                </body>
            `);
            const edgeSiblings = jsdom(`
                <body>
                    <div>
                        <div id="a">
                        </div>
                        <div id="stride">
                        </div>
                    </div>
                    <div>
                        <div id="b">
                        </div>
                    </div>
                </body>
            `);
            const stride = jsdom(`
                <body>
                    <div>
                        <div id="a">
                        </div>
                    </div>
                    <div id="stride">
                    </div>
                    <div>
                        <div id="b">
                        </div>
                    </div>
                </body>
            `);

            const noSiblings = jsdom(`
                <body>
                    <div>
                        <div id="a">
                        </div>
                        <div id="b">
                        </div>
                        <div id="stride">
                        </div>
                    </div>
                </body>
            `);
            const interposedSiblings = jsdom(`
                <body>
                    <div>
                        <div id="a">
                        </div>
                        <div id="stride">
                        </div>
                        <div id="b">
                        </div>
                    </div>
                </body>
            `);

            assertFarther(edgeSiblings, noStride);
            assertFarther(stride, noStride);
            assertFarther(interposedSiblings, noSiblings);
        });
    });

    describe('clusters()', function() {
        it('groups nearby similar nodes together', function() {
            const doc = jsdom(`
                <body>
                    <div>
                        <a id="A">A</a>
                        <a id="B">B</a>
                        <a id="C">C</a>
                    </div>
                    <div>
                        <a id="D">D</a>
                        <a id="E">E</a>
                        <a id="F">F</a>
                    </div>
                    <div>
                    </div>
                    <div>
                    </div>
                    <div>
                    </div>
                    <div>
                        <div>
                            <div>
                                <a id="G">G</a>
                            </div>
                        </div>
                    </div>
                </body>
            `);
            // The first 2 sets of <a> tags should be in one cluster, and the
            // last, at a different depth and separated by stride nodes, should
            // be in another.
            const TOO_FAR = 10;
            const theClusters = clusters(Array.from(doc.querySelectorAll('a')),
                                         TOO_FAR);

            // Here's a hacky way to compare Arrays by value. You can't do it
            // with Sets either. JS is an awful language.
            const readableClusters = JSON.stringify(theClusters.map(cluster => cluster.map(el => el.getAttribute('id'))));
            assert.equal(readableClusters, '[["G"],["E","D","F","B","A","C"]]');
            // The order of any of the 3 arrays is deterministic but doesn't matter.
        });
    });
});
