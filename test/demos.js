const {assert} = require('chai');
const {jsdom} = require('jsdom');

const {dom, flavor, rule, ruleset} = require('../index');
const {inlineTextLength, linkDensity} = require('../utils');


describe('Design-driving demos', function() {
    it('handles a simple series of short-circuiting rules', function () {
        // TODO: Short-circuiting isn't implemented yet. The motivation of this
        // test is to inspire changes to ranker functions that make them more
        // declarative, such that the engine can be smart enough to run the
        // highest-possible-scoring flavor-chain of rules first and, if it
        // succeeds, omit the others.
        const doc = jsdom(`
            <meta name="hdl" content="HDL">
            <meta property="og:title" content="OpenGraph">
            <meta property="twitter:title" content="Twitter">
            <title>Title</title>
        `);
        const rules = ruleset(
            rule(dom('meta[property="og:title"]'),
                 node => [{score: 40, flavor: 'titley', notes: node.element.content}]),
            rule(dom('meta[property="twitter:title"]'),
                 node => [{score: 30, flavor: 'titley', notes: node.element.content}]),
            rule(dom('meta[name="hdl"]'),
                 node => [{score: 20, flavor: 'titley', notes: node.element.content}]),
            rule(dom('title'),
                 node => [{score: 10, flavor: 'titley', notes: node.element.text}])
        );
        const kb = rules.score(doc);
        const node = kb.max('titley');
        assert.equal(node.score, 40);
        assert.equal(node.flavors.get('titley'), 'OpenGraph');
    });

    it("takes a decent shot at doing Readability's job", function () {
        // Score a node based on how much text is directly inside it and its
        // inline-tag children.
        function paragraphishByLength(node) {
            const length = inlineTextLength(node.element);
            return {
                flavor: 'paragraphish',
                score: length,
                notes: {inlineLength: length}  // Store expensive inline length.
            };
        }

        const doc = jsdom(`
            <p>
                <a class="good" href="/things">Things</a> / <a class="bad" href="/things/tongs">Tongs</a>
            </p>
            <p>
                Once upon a time, there was a large bear named Sid. Sid was very large and bearish, and he had a bag of hammers.
            </p>
            <div>
                <p>
                    One day, Sid traded the bag of hammers to a serial scribbler named Sam for a dozen doughnuts. It was a good trade. Sid lived happily ever after.
                </p>
            </div>
        `);
        // This set of rules might be the beginning of something that works.
        // (It's modeled after what I do when I try to do this by hand: I look
        // for balls of black text, and I look for them to be near each other,
        // generally siblings: a "cluster" of them.)
        const rules = ruleset(
            // Score on text length -> texty. We start with this because, no matter
            // the other markup details, the main body text is definitely going to
            // have a bunch of text.
            rule(dom('p,div'), paragraphishByLength),

            // Scale it by inverse of link density:
            rule(flavor('paragraphish'), node => ({score: 1 - linkDensity(node)}))

            // Give bonuses for being in p tags. TODO: article tags, too
            //rule(flavor('texty'), node => ({score: node.el.tagName === 'p' ? 1.5 : 1})),

            // Give bonuses for being (nth) cousins of other texties. IOW,
            // texties that are the same-leveled children of a common ancestor
            // get a bonus.
            //rule(flavor('texty'), node => ({score: numCousinsOfAtLeastOfScore(node, 200) * 1.5}))

            // Then do a nontrivial yanker which figures out which clump of high-scoring paragraphishes and the things between them to grab.
            // TODO: How do we ensure blockquotes, h2s, uls, etc. that are part of the article are included? Maybe what we're really looking for is a single, high-scoring container (or span of a container?) and then taking either everything inside it or everything but certain excised bits (interstitial ads/relateds). There might be 2 phases: rank and yank.
            // TODO: Also do something about invisible nodes.
        );
        const kb = rules.score(doc);
        const paragraphishes = kb.nodesOfFlavor('paragraphish');
        assert.equal(paragraphishes[0].score, 5);
        assert.equal(paragraphishes[1].score, 114);
        assert.equal(paragraphishes[3].score, 146);

//         assert.equal(clusters(paragraphishes),
//                      [[paragraphishes[0],
//                        paragraphishes[1]],
//                       [paragraphishes[3]]]);
        // Then pick the cluster with the highest sum of scores or the cluster around the highest-scoring node or the highest-scoring cluster by some formula (num typed nodes * scores of the nodes), and contiguous() it so things like ads are excluded but short paragraphs are included.
    });
});

// Right now, I'm writing features. We can use a supervised learning algorithm to find their coefficients. Someday, we can stop writing features and have deep learning algorithm come up with them. TODO: Grok unsupervised learning, and apply it to OpenCrawl.
// If we ever end up doing actual processing server-side, consider cheeriojs instead of jsdom. It may be 8x faster, though with a different API.
