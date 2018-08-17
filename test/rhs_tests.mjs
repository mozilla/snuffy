import {assert} from 'chai';

import {atMost, dom, note, out, props, rule, ruleset, score, type, typeIn} from '../index';
import {staticDom} from '../utils';


describe('RHS', function () {
    it('combines different calls piecewise, with rightmost repeated subfacts shadowing', function () {
        const rhs = type('foo').score(5).props(node => ({score: 6})).asRhs();
        assert.deepEqual(rhs.fact('dummy'), {type: 'foo', score: 6});
    });

    it('has same-named calls shadow, with rightmost winning', function () {
        const rhs = props(node => ({score: 1})).props(node => ({note: 'foo'})).asRhs();
        assert.deepEqual(rhs.fact('dummy'), {note: 'foo'});
    });

    it('runs callbacks only once', function () {
        let count = 0;
        function addOne() {
            count++;
            return {};
        }
        const rhs = props(addOne).asRhs();
        assert.deepEqual(rhs.fact('dummy'), {});
        assert.equal(count, 1);
    });

    it('ignores unexpected subfacts returned from props() callbacks', function () {
        const rhs = props(node => ({conserveScore: true, score: 3})).asRhs();
        assert.deepEqual(rhs.fact('dummy'), {score: 3});
    });

    it('enforces atMost()', function () {
        const doc = staticDom('<p></p>');
        const rules = ruleset(
            rule(dom('p'), score(8).type('para').atMost(3))
        );
        const facts = rules.against(doc);
        assert.throws(() => facts.get(type('para')),
                      'Score of 8 exceeds the declared atMost(3).');
    });

    it('works fine when atMost() is satisfied', function () {
        const doc = staticDom('<p></p>');
        const rules = ruleset(
            rule(dom('p'), atMost(3).score(2).type('para'))
        );
        const facts = rules.against(doc);
        assert.equal(facts.get(type('para'))[0].scoreFor('para'), 2);
    });

    it('enforces typeIn() for explicit types', function () {
        const doc = staticDom('<p></p>');
        const rules = ruleset(
            rule(dom('p'), typeIn('nope').type('para'))
        );
        const facts = rules.against(doc);
        assert.throws(() => facts.get(type('para')),
                      'A right-hand side claimed, via typeIn(...) to emit one of the types {nope} but actually emitted para.');
    });

    it('enforces typeIn() for inherited types', function () {
        const doc = staticDom('<p></p>');
        const rules = ruleset(
            rule(dom('p'), type('para')),
            rule(type('para'), props(n => ({})).typeIn('nope'))
        );
        const facts = rules.against(doc);
        assert.throws(() => facts.get(type('nope')),
                      'A right-hand side claimed, via typeIn(...) to emit one of the types {nope} but actually inherited para from the left-hand side.');
    });

    it('works fine when typeIn() is satisfied', function () {
        const doc = staticDom('<p></p>');
        const rules = ruleset(
            rule(dom('p'), typeIn('para').type('para'))
        );
        const facts = rules.against(doc);
        assert.equal(facts.get(type('para')).length, 1);
    });

    it('runs out().through() callbacks', function () {
        const doc = staticDom('<p></p>');
        const rules = ruleset(
            rule(dom('p'), out('para').through(fnode => fnode.element.tagName))
        );
        const facts = rules.against(doc);
        assert.equal(facts.get('para')[0], 'P');
    });

    it('paves over undefined notes', function () {
        // We shouldn't re-run any rules. Run order shouldn't matter, because
        // we forbid notes from overwriting, score multiplication is
        // commutative, and type assignment is idempotent and immutable.
        const doc = staticDom('<p></p>');
        const rules = ruleset(
            rule(dom('p'), type('para')),
            rule(type('para'), note(fnode => undefined)),
            rule(type('para'), note(fnode => 'foo'))
        );
        const facts = rules.against(doc);
        assert.equal(facts.get(type('para'))[0].noteFor('para'), 'foo');
    });

    it('runs scoring callbacks', function () {
        const doc = staticDom('<p></p>');
        const rules = ruleset(
            rule(dom('p'), type('p').score(fnode => 5))
        );
        const facts = rules.against(doc);
        assert.equal(facts.get(type('p'))[0].scoreFor('p'), 5);
    });
});
