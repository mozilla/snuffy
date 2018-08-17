// Tests for fathom/side.js

import {assert} from 'chai';

import {type} from '../index';


describe('Side', function () {
    it('makes a LHS out of a type()', function () {
        const side = type('smoo');
        assert(side.asLhs);  // It appears to be a Side.
        const lhs = side.asLhs();
        assert.notStrictEqual(lhs.max);  // It appears to be a TypeLhs.
    });

    it('is immutable and so can be factored up', function () {
        const defaults = type('smoo');
        const another = defaults.atMost(1);
        assert.equal(defaults._calls.length, 1);
        assert.equal(another._calls.length, 2);
    });
});
