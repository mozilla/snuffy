import wu from 'wu';

import {CycleError} from './exceptions';


/**
 * Return the passed-in arg. Useful as a default.
 */
export function identity(x) {
    return x;
}

/**
 * From an iterable return the best item, according to an arbitrary comparator
 * function. In case of a tie, the first item wins.
 *
 * @arg by {function} Given an item of the iterable, return a value to compare
 * @arg isBetter {function} Return whether its first arg is better than its
 *     second
 */
export function best(iterable, by, isBetter) {
    let bestSoFar, bestKeySoFar;
    let isFirst = true;
    wu.forEach(
        function (item) {
            const key = by(item);
            if (isBetter(key, bestKeySoFar) || isFirst) {
                bestSoFar = item;
                bestKeySoFar = key;
                isFirst = false;
            }
        },
        iterable);
    if (isFirst) {
        throw new Error('Tried to call best() on empty iterable');
    }
    return bestSoFar;
}

/**
 * Return the maximum item from an iterable, as defined by >.
 *
 * Works with any type that works with >. If multiple items are equally great,
 * return the first.
 *
 * @arg by {function} Given an item of the iterable, returns a value to
 *     compare
 */
export function max(iterable, by = identity) {
    return best(iterable, by, (a, b) => a > b);
}

/**
 * Return an Array of maximum items from an iterable, as defined by > and ===.
 *
 * If an empty iterable is passed in, return [].
 */
export function maxes(iterable, by = identity) {
    let bests = [];
    let bestKeySoFar;
    let isFirst = true;
    wu.forEach(
        function (item) {
            const key = by(item);
            if (key > bestKeySoFar || isFirst) {
                bests = [item];
                bestKeySoFar = key;
                isFirst = false;
            } else if (key === bestKeySoFar) {
                bests.push(item);
            }
        },
        iterable);
    return bests;
}

/**
 * Return the minimum item from an iterable, as defined by <.
 *
 * If multiple items are equally great, return the first. If an empty iterable
 * is passed in, return [].
 */
export function min(iterable, by = identity) {
    return best(iterable, by, (a, b) => a < b);
}

/**
 * Return the sum of an iterable, as defined by the + operator.
 */
export function sum(iterable) {
    let total;
    let isFirst = true;
    wu.forEach(
        function assignOrAdd(addend) {
            if (isFirst) {
                total = addend;
                isFirst = false;
            } else {
                total += addend;
            }
        },
        iterable);
    return total;
}

/**
 * Return the number of items in an iterable, consuming it as a side effect.
 */
export function length(iterable) {
    let num = 0;
    // eslint-disable-next-line no-unused-vars
    for (let item of iterable) {
        num++;
    }
    return num;
}

/**
 * Iterate, depth first, over a DOM node. Return the original node first.
 *
 * @arg shouldTraverse {function} Given a node, say whether we should
 *     include it and its children
 */
export function *walk(element, shouldTraverse) {
    yield element;
    for (let child of element.childNodes) {
        if (shouldTraverse(child)) {
            for (let w of walk(child, shouldTraverse)) {
                yield w;
            }
        }
    }
}

const blockTags = new Set(
    ['ADDRESS', 'BLOCKQUOTE', 'BODY', 'CENTER', 'DIR', 'DIV', 'DL',
     'FIELDSET', 'FORM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HR',
     'ISINDEX', 'MENU', 'NOFRAMES', 'NOSCRIPT', 'OL', 'P', 'PRE',
     'TABLE', 'UL', 'DD', 'DT', 'FRAMESET', 'LI', 'TBODY', 'TD',
     'TFOOT', 'TH', 'THEAD', 'TR', 'HTML']);
/**
 * Return whether a DOM element is a block element by default (rather than by
 * styling).
 */
export function isBlock(element) {
    return blockTags.has(element.tagName);
}

/**
 * Yield strings of text nodes within a normalized DOM node and its children,
 * without venturing into any contained block elements.
 *
 * @arg shouldTraverse {function} Specify additional elements to exclude by
 *     returning false
 */
export function *inlineTexts(element, shouldTraverse = element => true) {
    // TODO: Could we just use querySelectorAll() with a really long
    // selector rather than walk(), for speed?
    for (let child of walk(element,
                           element => !(isBlock(element) ||
                                        element.tagName === 'SCRIPT' &&
                                        element.tagName === 'STYLE')
                                      && shouldTraverse(element))) {
        if (child.nodeType === child.TEXT_NODE) {
            // wholeText() is not implemented by jsdom, so we use
            // textContent(). The result should be the same, since
            // we're calling it on only text nodes, but it may be
            // slower. On the positive side, it means we don't need to
            // normalize the DOM tree first.
            yield child.textContent;
        }
    }
}

/**
 * Return the total length of the inline text within an element, with
 * whitespace collapsed.
 *
 * @arg shouldTraverse {function} Specify additional elements to exclude by
 *     returning false
 */
export function inlineTextLength(element, shouldTraverse = element => true) {
    return sum(wu.map(text => collapseWhitespace(text).length,
                      inlineTexts(element, shouldTraverse)));
}

/**
 * Return a string with each run of whitespace collapsed to a single space.
 */
export function collapseWhitespace(str) {
    return str.replace(/\s{2,}/g, ' ');
}

/**
 * Return the ratio of the inline text length of the links in an element to the
 * inline text length of the entire element.
 *
 * @arg inlineLength {number} Optionally, the precalculated inline
 *     length of the fnode. If omitted, we will calculate it ourselves.
 */
export function linkDensity(fnode, inlineLength) {
    if (inlineLength === undefined) {
        inlineLength = inlineTextLength(fnode.element);
    }
    const lengthWithoutLinks = inlineTextLength(fnode.element,
                                                element => element.tagName !== 'A');
    return (inlineLength - lengthWithoutLinks) / inlineLength;
}

/**
 * Return whether an element is a text node that consist wholly of whitespace.
 */
export function isWhitespace(element) {
    return (element.nodeType === element.TEXT_NODE &&
            element.textContent.trim().length === 0);
}

/**
 * Get a key of a map, first setting it to a default value if it's missing.
 */
export function setDefault(map, key, defaultMaker) {
    if (map.has(key)) {
        return map.get(key);
    }
    const defaultValue = defaultMaker();
    map.set(key, defaultValue);
    return defaultValue;
}

/**
 * Get a key of a map or, if it's missing, a default value.
 */
export function getDefault(map, key, defaultMaker) {
    if (map.has(key)) {
        return map.get(key);
    }
    return defaultMaker();
}

/**
 * Return an backward iterator over an Array.
 */
export function *reversed(array) {
    for (let i = array.length - 1; i >= 0; i--) {
        yield array[i];
    }
}

/**
 * Return an Array, the reverse topological sort of the given nodes.
 *
 * @arg nodes An iterable of arbitrary things
 * @arg nodesThatNeed {function} Take a node and returns an Array of nodes
 *     that depend on it
 */
export function toposort(nodes, nodesThatNeed) {
    const ret = [];
    const todo = new Set(nodes);
    const inProgress = new Set();

    function visit(node) {
        if (inProgress.has(node)) {
            throw new CycleError('The graph has a cycle.');
        }
        if (todo.has(node)) {
            inProgress.add(node);
            for (let needer of nodesThatNeed(node)) {
                visit(needer);
            }
            inProgress.delete(node);
            todo.delete(node);
            ret.push(node);
        }
    }

    while (todo.size > 0) {
        visit(first(todo));
    }
    return ret;
}

/**
 * A Set with the additional methods it ought to have had
 */
export class NiceSet extends Set {
    /**
     * Remove and return an arbitrary item. Throw an Error if I am empty.
     */
    pop() {
        for (let v of this.values()) {
            this.delete(v);
            return v;
        }
        throw new Error('Tried to pop from an empty NiceSet.');
    }

    /**
     * Union another set or other iterable into myself.
     *
     * @return myself, for chaining
     */
    extend(otherSet) {
        for (let item of otherSet) {
            this.add(item);
        }
        return this;
    }

    /**
     * Actually show the items in me.
     */
    toString() {
        return '{' + Array.from(this).join(', ') + '}';
    }
}

/**
 * Return the first item of an iterable.
 */
export function first(iterable) {
    for (let i of iterable) {
        return i;
    }
}

/**
 * Given any node in a DOM tree, return the root element of the tree, generally
 * an HTML element.
 */
export function rootElement(element) {
    let parent;
    while ((parent = element.parentNode) !== null && parent.nodeType === parent.ELEMENT_NODE) {
        element = parent;
    }
    return element;
}

/**
 * Return the number of times a regex occurs within the string `haystack`.
 *
 * Caller must make sure `regex` has the 'g' option set.
 */
export function numberOfMatches(regex, haystack) {
    return (haystack.match(regex) || []).length;
}

/**
 * Wrap a scoring callback, and set its element to the page root iff a score is
 * returned.
 *
 * This is used to build rulesets which classify entire pages rather than
 * picking out specific elements.
 */
export function page(scoringFunction) {
    function wrapper(node) {
        const scoreAndTypeAndNote = scoringFunction(node);
        if (scoreAndTypeAndNote.score !== undefined) {
            scoreAndTypeAndNote.element = rootElement(node.element);
        }
        return scoreAndTypeAndNote;
    }
    return wrapper;
}

/**
 * Sort the elements by their position in the DOM.
 *
 * @arg fnodes {iterable} fnodes to sort
 * @return {Array} sorted fnodes
 */
export function domSort(fnodes) {
    function compare(a, b) {
        const element = a.element;
        const position = element.compareDocumentPosition(b.element);
        if (position & element.DOCUMENT_POSITION_FOLLOWING) {
            return -1;
        } else if (position & element.DOCUMENT_POSITION_PRECEDING) {
            return 1;
        } else {
            return 0;
        }
    }
    return Array.from(fnodes).sort(compare);
}

/**
 * @return whether a thing appears to be a DOM element.
 */
export function isDomElement(thing) {
    return thing.nodeName !== undefined;
}

/**
 * Checks whether any of the element's attribute values satisfy some condition.
 *
 * Example::
 *
 *     rule(type('foo'),
 *          score(attributesMatch(element,
 *                                attr => attr.includes('good'),
 *                                ['id', 'alt']) ? 2 : 1))
 *
 * @arg element {Node} Element whose attributes you want to search
 * @arg predicate {function} A condition to check. Take a string and
 *     return a boolean. If an attribute has multiple values (e.g. the class
 *     attribute), attributesMatch will check each one.
 * @arg attrs {string[]} An Array of attributes you want to search. If none are
 *     provided, search all.
 * @return Whether any of the attribute values satisfy the predicate function
 */
export function attributesMatch(element, predicate, attrs = []) {
    const attributes = attrs.length === 0 ? Array.from(element.attributes).map(a => a.name) : attrs;
    for (let i = 0; i < attributes.length; i++) {
        const attr = element.getAttribute(attributes[i]);
        // If the attribute is an array, apply the scoring function to each element
        if (attr && ((Array.isArray(attr) && attr.some(predicate)) || predicate(attr))) {
            return true;
        }
    }
    return false;
}

/**
 * Yield an element and each of its ancestors.
 */
export function *ancestors(element) {
    yield element;
    let parent;
    while ((parent = element.parentNode) !== null && parent.nodeType === parent.ELEMENT_NODE) {
        yield parent;
        element = parent;
    }
}

export default {
    ancestors,
    best,
    collapseWhitespace,
    domSort,
    first,
    getDefault,
    identity,
    inlineTextLength,
    inlineTexts,
    isBlock,
    isDomElement,
    isWhitespace,
    length,
    linkDensity,
    max,
    maxes,
    min,
    NiceSet,
    numberOfMatches,
    page,
    reversed,
    rootElement,
    attributesMatch,
    setDefault,
    sum,
    toposort,
    walk
};
