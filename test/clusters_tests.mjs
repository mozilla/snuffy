// Tests for fathom/clusters.js

import {assert} from 'chai';

import {distance, clusters} from '../clusters';
import {staticDom} from '../utils';


// Assert that the distance between nodes a and b is greater in the `deep` DOM
// tree than in the `shallow` one.
function assertFarther(deep, shallow) {
    assert.isAbove(distance(deep.getElementById('a'),
                            deep.getElementById('b')),
                   distance(shallow.getElementById('a'),
                            shallow.getElementById('b')));
}


describe('Cluster tests', function () {
    describe('distance()', function () {
        // If we keep these tests unbrittle enough, we can use them as a
        // fitness function to search for optimal values of cost coefficients.

        it('considers a node 0 distance from itself', function () {
            const doc = staticDom(`
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
            const shallow = staticDom(`
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
            const deep = staticDom(`
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
            const doc = staticDom(`
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
            const dissimilar = staticDom(`
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
            const similar = staticDom(`
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
            const noStride = staticDom(`
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
            const edgeSiblings = staticDom(`
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
            const stride = staticDom(`
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

            const noSiblings = staticDom(`
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
            const interposedSiblings = staticDom(`
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

        it('considers A and B to be far apart if one contains the other', function () {
            // This tends to ostracize the inner element, which is good,
            // because it's not interesting, because we'll get it through
            // including the outer element in the cluster.
            const doc = staticDom(`
                <body>
                    <div id="b">
                        <div id="a">
                        </div>
                    </div>
                </body>
            `);
            assert.equal(distance(doc.getElementById('a'),
                                  doc.getElementById('b')),
                         Number.MAX_VALUE);
            assert.equal(distance(doc.getElementById('b'),
                                  doc.getElementById('a')),
                         Number.MAX_VALUE);
        });

        it('adds in the results of additionalCost functions', function () {
            const doc = staticDom(`
                <body>
                    <div id="a">
                    </div>
                    <div id="b">
                    </div>
                </body>
            `);
            assert.equal(distance(doc.getElementById('a'),
                                  doc.getElementById('b'),
                                  {additionalCost: (a, b) => 7}),
                         9);
        });
    });

    describe('clusters()', function () {
        it('groups nearby similar nodes together', function () {
            const doc = staticDom(`
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

            const readableClusters = theClusters.map(cluster => cluster.map(el => el.getAttribute('id')));
            assert.deepEqual(readableClusters, [['G'],['E','D','F','B','A','C']]);
            // The order of any of the 3 arrays is deterministic but doesn't matter.
        });
    });
});
