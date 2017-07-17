const {assert} = require('chai');

const {dom, rule, ruleset, score, type, typeIn} = require('../index');
const {staticDom} = require('../utils');


describe('Rule', function () {
    it('knows what it can add and emit', function () {
        const a = rule(dom('p'), type('para'));
        assert.sameMembers(Array.from(a.typesItCouldEmit()), ['para']);
        assert.sameMembers(Array.from(a.typesItCouldAdd()), ['para']);

        const b = rule(type('r'), typeIn('q').props('dummy').typeIn('r', 's'));
        assert.sameMembers(Array.from(b.typesItCouldEmit()), ['r', 's']);
        assert.sameMembers(Array.from(b.typesItCouldAdd()), ['s']);

        const c = rule(type('a'), score(2));
        assert.sameMembers(Array.from(c.typesItCouldEmit()), ['a']);
    });

    it('identifies prerequisite rules', function () {
        const domRule = rule(dom('p'), type('a'));
        const maxRule = rule(type('a').max(), type('b'));
        const maintainRule = rule(type('b'), score(2));
        const addRule = rule(type('b'), type('c'));
        const rules = ruleset(domRule, maxRule, maintainRule, addRule);
        const facts = rules.against(staticDom(''));
        assert.sameMembers(Array.from(domRule.prerequisites(facts)), []);
        assert.sameMembers(Array.from(maxRule.prerequisites(facts)), [domRule]);
        assert.sameMembers(Array.from(maintainRule.prerequisites(facts)), [maxRule]);
        assert.sameMembers(Array.from(addRule.prerequisites(facts)), [maxRule, maintainRule]);

        const prereqs = facts._prerequisitesTo(addRule);
        // TODO: Replace with deepEqual when chai >= 4.0 supports Maps and Sets.
        assert.equal(prereqs.size, 3);
        assert.deepEqual(prereqs.get(maintainRule), [addRule]);
        assert.deepEqual(prereqs.get(domRule), [maxRule]);
        assert.deepEqual(prereqs.get(maxRule), [addRule, maintainRule]);
    });
});
