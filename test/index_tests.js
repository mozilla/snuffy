// Tests for fathom/index.js

const {assert} = require('chai');
const {jsdom} = require('jsdom');

const {dom, rule, ruleset, flavor} = require('../index');


describe('Ranker tests', function() {
    it('scores a node with a simple DOM rule and inserts an empty scribble', function () {
        const doc = jsdom(`
            <p>
                <a class="good" href="https://github.com/jsdom">Good!</a>
                <a class="bad" href="https://github.com/jsdom">Bad!</a>
            </p>
        `);
        const rules = ruleset(
            rule(dom('a[class=good]'), node => [{score: 2, flavor: 'anchor'}])
        );
        const kb = rules.score(doc);
        const node = kb.nodeForElement(doc.querySelectorAll('a[class=good]')[0]);
        assert.equal(node.score, 2);
        assert.equal(node.flavors.get('anchor'), undefined);
    });

    it('applies flavored rules when there is input for them', function () {
        const doc = jsdom(`
            <p>Hi</p>
            <div>Hooooooo</div>
        `);
        const rules = ruleset(
            // 2 separate rules feed into the "paragraphish" flavor:
            rule(dom('div'), node => [{flavor: 'paragraphish'}]),
            rule(dom('p'), node => [{flavor: 'paragraphish', score: 2}]),

            // Then each paragraphish thing receives a bonus based on its length:
            rule(flavor('paragraphish'), node => [{score: node.element.textContent.length}])
        );
        const kb = rules.score(doc);
        const p = kb.nodeForElement(doc.querySelectorAll('p')[0]);
        const div = kb.nodeForElement(doc.querySelectorAll('div')[0]);
        assert.equal(p.score, 4);
        assert.equal(div.score, 8);
    });
});
