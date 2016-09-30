const {flatten, forEach, map} = require('wu');


function identity(x) {
    return x;
}


// From an iterable return the best item, according to an arbitrary comparator
// function. In case of a tie, the first item wins.
function best(iterable, by, isBetter) {
    let bestSoFar, bestKeySoFar;
    let isFirst = true;
    forEach(
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


// Return the maximum item from an iterable, as defined by >.
//
// Works with any type that works with >. If multiple items are equally great,
// return the first.
//
// by: a function that, given an item of the iterable, returns a value to
//     compare
function max(iterable, by = identity) {
    return best(iterable, by, (a, b) => a > b);
}


function min(iterable, by = identity) {
    return best(iterable, by, (a, b) => a < b);
}


// Return the sum of an iterable, as defined by the + operator.
function sum(iterable) {
    let total;
    let isFirst = true;
    forEach(
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


function length(iterable) {
    let num = 0;
    for (const item of iterable) { // eslint-disable-line no-unused-vars
        num++;
    }
    return num;
}


// Iterate, depth first, over a DOM node. Return the original node first.
// shouldTraverse - a function on a node saying whether we should include it
//     and its children
function *walk(element, shouldTraverse) {
    yield element;
    for (const child of element.childNodes) {
        if (shouldTraverse(child)) {
            for (const w of walk(child, shouldTraverse)) {
                yield w;
            }
        }
    }
}


const blockTags = new Set();
forEach(blockTags.add.bind(blockTags),
        ['ADDRESS', 'BLOCKQUOTE', 'BODY', 'CENTER', 'DIR', 'DIV', 'DL',
         'FIELDSET', 'FORM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HR',
         'ISINDEX', 'MENU', 'NOFRAMES', 'NOSCRIPT', 'OL', 'P', 'PRE',
         'TABLE', 'UL', 'DD', 'DT', 'FRAMESET', 'LI', 'TBODY', 'TD',
         'TFOOT', 'TH', 'THEAD', 'TR', 'HTML']);
// Return whether a DOM element is a block element by default (rather
// than by styling).
function isBlock(element) {
    return blockTags.has(element.tagName);
}


// Yield strings of text nodes within a normalized DOM node and its
// children, without venturing into any contained block elements.
//
// shouldTraverse: A function that specifies additional elements to
//     exclude by returning false
function *inlineTexts(element, shouldTraverse = element => true) {
    // TODO: Could we just use querySelectorAll() with a really long
    // selector rather than walk(), for speed?
    for (const child of walk(element,
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


function inlineTextLength(element, shouldTraverse = element => true) {
    return sum(map(text => collapseWhitespace(text).length,
                   inlineTexts(element, shouldTraverse)));
}


function collapseWhitespace(str) {
    return str.replace(/\s{2,}/g, ' ');
}


// Return the ratio of the inline text length of the links in an
// element to the inline text length of the entire element.
function linkDensity(node) {
    const length = node.flavors.get('paragraphish').inlineLength;
    const lengthWithoutLinks = inlineTextLength(node.element,
                                                element => element.tagName !== 'A');
    return (length - lengthWithoutLinks) / length;
}


// Return the next sibling node of `element`, skipping over text nodes that
// consist wholly of whitespace.
function isWhitespace(element) {
    return (element.nodeType === element.TEXT_NODE &&
            element.textContent.trim().length === 0);
}


// Return the number of stride nodes between 2 DOM nodes *at the same
// level of the tree*, without going up or down the tree.
//
// Stride nodes are {(1) siblings or (2) siblings of ancestors} that lie
// between the 2 nodes. These interposed nodes make it less likely that the 2
// nodes should be together in a cluster.
//
// left xor right may also be undefined.
function numStrides(left, right) {
    let num = 0;

    // Walk right from left node until we hit the right node or run out:
    let sibling = left;
    let shouldContinue = sibling && sibling !== right;
    while (shouldContinue) {
        sibling = sibling.nextSibling;
        if ((shouldContinue = sibling && sibling !== right) &&
            !isWhitespace(sibling)) {
            num += 1;
        }
    }
    if (sibling !== right) {  // Don't double-punish if left and right are siblings.
        // Walk left from right node:
        sibling = right;
        while (sibling) {
            sibling = sibling.previousSibling;
            if (sibling && !isWhitespace(sibling)) {
                num += 1;
            }
        }
    }
    return num;
}


// Return a distance measurement between 2 DOM nodes.
//
// I was thinking of something that adds little cost for siblings.
// Up should probably be more expensive than down (see middle example in the Nokia paper).
// O(n log n)
function distance(elementA, elementB) {
    // TODO: Test and tune these costs. They're off-the-cuff at the moment.
    //
    // Cost for each level deeper one node is than the other below their common
    // ancestor:
    const DIFFERENT_DEPTH_COST = 2;
    // Cost for a level below the common ancestor where tagNames differ:
    const DIFFERENT_TAG_COST = 2;
    // Cost for a level below the common ancestor where tagNames are the same:
    const SAME_TAG_COST = 1;
    // Cost for each stride node between A and B:
    const STRIDE_COST = 1;

    if (elementA === elementB) {
        return 0;
    }

    // Stacks that go from the common ancestor all the way to A and B:
    const aAncestors = [elementA];
    const bAncestors = [elementB];

    let aAncestor = elementA;
    let bAncestor = elementB;

    // Ascend to common parent, stacking them up for later reference:
    while (!aAncestor.contains(elementB)) {
        aAncestor = aAncestor.parentNode;
        aAncestors.push(aAncestor);
    }

    // Make an ancestor stack for the right node too so we can walk
    // efficiently down to it:
    do {
        bAncestor = bAncestor.parentNode;  // Assumes we've early-returned above if A === B.
        bAncestors.push(bAncestor);
    } while (bAncestor !== aAncestor);

    // Figure out which node is left and which is right, so we can follow
    // sibling links in the appropriate directions when looking for stride
    // nodes:
    let left = aAncestors;
    let right = bAncestors;
    // In compareDocumentPosition()'s opinion, inside implies after. Basically,
    // before and after pertain to opening tags.
    const comparison = elementA.compareDocumentPosition(elementB);
    let cost = 0;
    let mightStride;
    if (comparison & elementA.DOCUMENT_POSITION_FOLLOWING) {
        // A is before, so it could contain the other node.
        mightStride = !(comparison & elementA.DOCUMENT_POSITION_CONTAINED_BY)
        left = aAncestors;
        right = bAncestors;
    } else if (comparison & elementA.DOCUMENT_POSITION_PRECEDING) {
        // A is after, so it might be contained by the other node.
        mightStride = !(comparison & elementA.DOCUMENT_POSITION_CONTAINS)
        left = bAncestors;
        right = aAncestors;
    }

    // Descend to both nodes in parallel, discounting the traversal
    // cost iff the nodes we hit look similar, implying the nodes dwell
    // within similar structures.
    while (left.length || right.length) {
        const l = left.pop();
        const r = right.pop();
        if (l === undefined || r === undefined) {
            // Punishment for being at different depths: same as ordinary
            // dissimilarity punishment for now
            cost += DIFFERENT_DEPTH_COST;
        } else {
            // TODO: Consider similarity of classList.
            cost += l.tagName === r.tagName ? SAME_TAG_COST : DIFFERENT_TAG_COST;
        }
        // Optimization: strides might be a good dimension to eliminate.
        if (mightStride) {
            cost += numStrides(l, r) * STRIDE_COST;
        }
    }

    return cost;
}


// A lower-triangular matrix of inter-cluster distances
// TODO: Allow distance function to be passed in, making this generally useful
// and not tied to the DOM.
class DistanceMatrix {
    constructor (elements) {
        // A sparse adjacency matrix:
        // {A => {},
        //  B => {A => 4},
        //  C => {A => 4, B => 4},
        //  D => {A => 4, B => 4, C => 4}
        //  E => {A => 4, B => 4, C => 4, D => 4}}
        //
        // A, B, etc. are arrays of [arrays of arrays of...] DOM nodes, each
        // array being a cluster. In this way, they not only accumulate a
        // cluster but retain the steps along the way.
        //
        // This is an efficient data structure in terms of CPU and memory, in
        // that we don't have to slide a lot of memory around when we delete a
        // row or column from the middle of the matrix while merging. Of
        // course, we lose some practical efficiency by using hash tables, and
        // maps in particular are slow in their early implementations.
        this._matrix = new Map();

        // Convert elements to clusters:
        const clusters = elements.map(el => [el]);

        // Init matrix:
        for (const outerCluster of clusters) {
            const innerMap = new Map();
            for (const innerCluster of this._matrix.keys()) {
                innerMap.set(innerCluster, distance(outerCluster[0],
                                                    innerCluster[0]));
            }
            this._matrix.set(outerCluster, innerMap);
        }
        this._numClusters = clusters.length;
    }

    // Return (distance, a: clusterA, b: clusterB) of closest-together clusters.
    // Replace this to change linkage criterion.
    closest () {
        const self = this;

        if (this._numClusters < 2) {
            throw new Error('There must be at least 2 clusters in order to return the closest() ones.');
        }

        // Return the distances between every pair of clusters.
        function *clustersAndDistances() {
            for (const [outerKey, row] of self._matrix.entries()) {
                for (const [innerKey, storedDistance] of row.entries()) {
                    yield {a: outerKey, b: innerKey, distance: storedDistance};
                }
            }
        }
        return min(clustersAndDistances(), x => x.distance);
    }

    // Look up the distance between 2 clusters in me. Try the lookup in the
    // other direction if the first one falls in the nonexistent half of the
    // triangle.
    _cachedDistance (clusterA, clusterB) {
        let ret = this._matrix.get(clusterA).get(clusterB);
        if (ret === undefined) {
            ret = this._matrix.get(clusterB).get(clusterA);
        }
        return ret;
    }

    // Merge two clusters.
    merge (clusterA, clusterB) {
        // An example showing how rows merge:
        //  A: {}
        //  B: {A: 1}
        //  C: {A: 4, B: 4},
        //  D: {A: 4, B: 4, C: 4}
        //  E: {A: 4, B: 4, C: 2, D: 4}}
        //
        // Step 2:
        //  C: {}
        //  D: {C: 4}
        //  E: {C: 2, D: 4}}
        //  AB: {C: 4, D: 4, E: 4}
        //
        // Step 3:
        //  D:  {}
        //  AB: {D: 4}
        //  CE: {D: 4, AB: 4}

        // Construct new row, finding min distances from either subcluster of
        // the new cluster to old clusters.
        //
        // There will be no repetition in the matrix because, after all,
        // nothing pointed to this new cluster before it existed.
        const newRow = new Map();
        for (const outerKey of this._matrix.keys()) {
            if (outerKey !== clusterA && outerKey !== clusterB) {
                newRow.set(outerKey, Math.min(this._cachedDistance(clusterA, outerKey),
                                              this._cachedDistance(clusterB, outerKey)));
            }
        }

        // Delete the rows of the clusters we're merging.
        this._matrix.delete(clusterA);
        this._matrix.delete(clusterB);

        // Remove inner refs to the clusters we're merging.
        for (const inner of this._matrix.values()) {
            inner.delete(clusterA);
            inner.delete(clusterB);
        }

        // Attach new row.
        this._matrix.set([clusterA, clusterB], newRow);

        // There is a net decrease of 1 cluster:
        this._numClusters -= 1;
    }

    numClusters () {
        return this._numClusters;
    }

    // Return an Array of nodes for each cluster in me.
    clusters () {
        // TODO: Can't get wu.map to work here. Don't know why.
        return Array.from(this._matrix.keys()).map(e => Array.from(flatten(false, e)));
    }
}


// Partition the given nodes into one or more clusters by position in the DOM
// tree.
//
// elements: An Array of DOM nodes
// tooFar: The closest-nodes distance() beyond which we will not attempt to
//     unify 2 clusters
//
// This implements an agglomerative clustering. It uses single linkage, since
// we're talking about adjacency here more than Euclidean proximity: the
// clusters we're talking about in the DOM will tend to be adjacent, not
// overlapping. We haven't tried other linkage criteria yet.
//
// Maybe later we'll consider score or notes.
function clusters(elements, tooFar) {
    const matrix = new DistanceMatrix(elements);
    let closest;

    while (matrix.numClusters() > 1 && (closest = matrix.closest()).distance < tooFar) {
        matrix.merge(closest.a, closest.b);
    }

    return matrix.clusters();
}


module.exports = {
    best,
    collapseWhitespace,
    clusters,
    distance,
    identity,
    inlineTextLength,
    inlineTexts,
    isBlock,
    length,
    linkDensity,
    max,
    min,
    sum,
    walk
};
