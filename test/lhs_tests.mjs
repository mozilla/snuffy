import {assert} from 'chai';

import {dom, rule, ruleset, out, type} from '../index';
import {staticDom} from '../utils';


describe('LHS', function () {
    it('makes a dom() LHS that rule() tolerates', function () {
        const lhs = dom('smoo');
        const rhs = type('bar');
        rule(lhs, rhs);
    });

    it('finds max-scoring nodes of a type', function () {
        const doc = staticDom(`
            <p></p>
            <div></div>
            <div></div>
        `);
        const rules = ruleset(
            rule(dom('p'), type('smoo').score(2)),
            rule(dom('div'), type('smoo').score(5)),
            rule(type('smoo').max(), out('best'))
        );
        const facts = rules.against(doc);
        const best = facts.get('best');
        assert.equal(best.length, 2);
        assert.equal(best[0].element.nodeName, 'DIV');
        assert.equal(best[1].element.nodeName, 'DIV');
    });

    it('returns [] for a top-totaling cluster of 0 nodes', function () {
        const doc = staticDom(`
            <p></p>
        `);
        const rules = ruleset(
            rule(dom('div'), type('smoo')),
            rule(type('smoo').bestCluster(), out('cluster'))
        );
        const facts = rules.against(doc);
        assert.deepEqual(facts.get('cluster'), []);
    });

    it('can have its type overridden', function () {
        const doc = staticDom('<p></p>');
        const rules = ruleset(
            rule(dom('p'), type('bar')),
            rule(type('foo').type('bar'), out('best'))
        );
        const facts = rules.against(doc);
        const best = facts.get('best');
        assert.equal(best.length, 1);
    });

    it('testing when() on type()', function () {
        const doc = staticDom('<p id="fat"></p><p id="bat"></p>');
        const rules = ruleset(
            rule(dom('p'), type('bar')),
            rule(type('bar').when(fnode => fnode.element.id === 'fat'), type('when')),
            rule(type('when'), out('best'))
        );
        const facts = rules.against(doc);
        const best = facts.get('best');
        assert.equal(best.length, 1);
        assert.equal(best[0].element.id, 'fat');
    });

    it('testing when() on dom()', function () {
        const doc = staticDom('<p id="fat"></p><p id="bat"></p>');
        const rules = ruleset(
            rule(dom('p').when(fnode => fnode.element.id === 'bat'), type('when')),
            rule(type('when'), out('best'))
        );
        const facts = rules.against(doc);
        const best = facts.get('best');
        assert.equal(best.length, 1);
        assert.equal(best[0].element.id, 'bat');
    });

});
