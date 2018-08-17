import wu from 'wu';
import {isDomElement, isWhitespace, min} from './utilsForFrontend';


/**
 * Return the number of stride nodes between 2 DOM nodes *at the same
 * level of the tree*, without going up or down the tree.
 *
 * Stride nodes are {(1) siblings or (2) siblings of ancestors} that lie
 * between the 2 nodes. These interposed nodes make it less likely that the 2
 * nodes should be together in a cluster.
 *
 * ``left`` xor ``right`` may also be undefined.
 */
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

/**
 * Return a distance measurement between 2 DOM nodes or :term:`fnodes<fnode>`.
 *
 * Return ``Number.MAX_VALUE`` if one of the nodes contains the other.
 *
 * This is largely an implementation detail of :func:`clusters`, but you can
 * call it yourself if you wish to implement your own clustering. Takes O(n log
 * n) time.
 *
 * Note that the default costs may change; pass them in explicitly if they are
 * important to you.
 *
 * @arg fnodeA {Node|Fnode}
 * @arg fnodeB {Node|Fnode}
 * @arg differentDepthCost {number} Cost for each level deeper one node is than
 *    the other below their common ancestor
 * @arg differentTagCost {number} Cost for a level below the common ancestor
 *    where tagNames differ
 * @arg sameTagCost {number} Cost for a level below the common ancestor where
 *    tagNames are the same
 * @arg strideCost {number} Cost for each stride node between A and B
 * @arg additionalCost {function} Return an additional cost, given 2 fnodes or
 *    nodes.
 *
 */
function distance(fnodeA,
                  fnodeB,
                  {differentDepthCost = 2,
                   differentTagCost = 2,
                   sameTagCost = 1,
                   strideCost = 1,
                   additionalCost = (fnodeA, fnodeB) => 0} = {}) {
    // I was thinking of something that adds little cost for siblings. Up
    // should probably be more expensive than down (see middle example in the
    // Nokia paper).

    // TODO: Test and tune default costs. They're off the cuff at the moment.

    if (fnodeA === fnodeB) {
        return 0;
    }

    const elementA = isDomElement(fnodeA) ? fnodeA : fnodeA.element;
    const elementB = isDomElement(fnodeB) ? fnodeB : fnodeB.element;

    // Stacks that go from the common ancestor all the way to A and B:
    const aAncestors = [elementA];
    const bAncestors = [elementB];

    let aAncestor = elementA;
    let bAncestor = elementB;

    // Ascend to common parent, stacking them up for later reference:
    while (!aAncestor.contains(elementB)) {  // Note: an element does contain() itself.
        aAncestor = aAncestor.parentNode;
        aAncestors.push(aAncestor); //aAncestors = [a, b]. aAncestor = b // if a is outer: no loop here; aAncestors = [a]. aAncestor = a.
    }

    // In compareDocumentPosition()'s opinion, inside implies after. Basically,
    // before and after pertain to opening tags.
    const comparison = elementA.compareDocumentPosition(elementB);

    // If either contains the other, abort. We'd either return a misleading
    // number or else walk upward right out of the document while trying to
    // make the ancestor stack.
    if (comparison & (elementA.DOCUMENT_POSITION_CONTAINS | elementA.DOCUMENT_POSITION_CONTAINED_BY)) {
        return Number.MAX_VALUE;
    }
    // Make an ancestor stack for the right node too so we can walk
    // efficiently down to it:
    do {
        bAncestor = bAncestor.parentNode;  // Assumes we've early-returned above if A === B. This walks upward from the outer node and up out of the tree. It STARTS OUT with aAncestor === bAncestor!
        bAncestors.push(bAncestor);
    } while (bAncestor !== aAncestor);

    // Figure out which node is left and which is right, so we can follow
    // sibling links in the appropriate directions when looking for stride
    // nodes:
    let left = aAncestors;
    let right = bAncestors;
    let cost = 0;
    if (comparison & elementA.DOCUMENT_POSITION_FOLLOWING) {
        // A is before, so it could contain the other node. What did I mean to do if one contained the other?
        left = aAncestors;
        right = bAncestors;
    } else if (comparison & elementA.DOCUMENT_POSITION_PRECEDING) {
        // A is after, so it might be contained by the other node.
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
            cost += differentDepthCost;
        } else {
            // TODO: Consider similarity of classList.
            cost += l.tagName === r.tagName ? sameTagCost : differentTagCost;
        }
        // Optimization: strides might be a good dimension to eliminate.
        if (strideCost !== 0) {
            cost += numStrides(l, r) * strideCost;
        }
    }

    return cost + additionalCost(fnodeA, fnodeB);
}

/** A lower-triangular matrix of inter-cluster distances */
class DistanceMatrix {
    /**
     * @arg distance {function} Some notion of distance between 2 given nodes
     */
    constructor(elements, distance) {
        // A sparse adjacency matrix:
        // {A => {},
        //  B => {A => 4},
        //  C => {A => 4, B => 4},
        //  D => {A => 4, B => 4, C => 4}
        //  E => {A => 4, B => 4, C => 4, D => 4}}
        //
        // A, B, etc. are arrays of [arrays of arrays of...] nodes, each
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
        for (let outerCluster of clusters) {
            const innerMap = new Map();
            for (let innerCluster of this._matrix.keys()) {
                innerMap.set(innerCluster, distance(outerCluster[0],
                                                    innerCluster[0]));
            }
            this._matrix.set(outerCluster, innerMap);
        }
        this._numClusters = clusters.length;
    }

    // Return (distance, a: clusterA, b: clusterB) of closest-together clusters.
    // Replace this to change linkage criterion.
    closest() {
        const self = this;

        if (this._numClusters < 2) {
            throw new Error('There must be at least 2 clusters in order to return the closest() ones.');
        }

        // Return the distances between every pair of clusters.
        function clustersAndDistances() {
            const ret = [];
            for (let [outerKey, row] of self._matrix.entries()) {
                for (let [innerKey, storedDistance] of row.entries()) {
                    ret.push({a: outerKey, b: innerKey, distance: storedDistance});
                }
            }
            return ret;
        }
        // Optimizing this by inlining the loop and writing it less
        // functionally doesn't help:
        return min(clustersAndDistances(), x => x.distance);
    }

    // Look up the distance between 2 clusters in me. Try the lookup in the
    // other direction if the first one falls in the nonexistent half of the
    // triangle.
    _cachedDistance(clusterA, clusterB) {
        let ret = this._matrix.get(clusterA).get(clusterB);
        if (ret === undefined) {
            ret = this._matrix.get(clusterB).get(clusterA);
        }
        return ret;
    }

    // Merge two clusters.
    merge(clusterA, clusterB) {
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
        for (let outerKey of this._matrix.keys()) {
            if (outerKey !== clusterA && outerKey !== clusterB) {
                newRow.set(outerKey, Math.min(this._cachedDistance(clusterA, outerKey),
                                              this._cachedDistance(clusterB, outerKey)));
            }
        }

        // Delete the rows of the clusters we're merging.
        this._matrix.delete(clusterA);
        this._matrix.delete(clusterB);

        // Remove inner refs to the clusters we're merging.
        for (let inner of this._matrix.values()) {
            inner.delete(clusterA);
            inner.delete(clusterB);
        }

        // Attach new row.
        this._matrix.set([clusterA, clusterB], newRow);

        // There is a net decrease of 1 cluster:
        this._numClusters -= 1;
    }

    numClusters() {
        return this._numClusters;
    }

    // Return an Array of nodes for each cluster in me.
    clusters() {
        // TODO: Can't get wu.map to work here. Don't know why.
        return Array.from(this._matrix.keys()).map(e => Array.from(wu.flatten(false, e)));
    }
}

/**
 * Partition the given nodes into one or more clusters by position in the DOM
 * tree.
 *
 * This implements an agglomerative clustering. It uses single linkage, since
 * we're talking about adjacency here more than Euclidean proximity: the
 * clusters we're talking about in the DOM will tend to be adjacent, not
 * overlapping. We haven't tried other linkage criteria yet.
 *
 * In a later release, we may consider score or notes.
 *
 * @arg {Fnode[]|Node[]} fnodes :term:`fnodes<fnode>` or DOM nodes to group
 *     into clusters
 * @arg {number} splittingDistance The closest-nodes :func:`distance` beyond
 *     which we will not attempt to unify 2 clusters. Make this larger to make
 *     larger clusters.
 * @arg getDistance {function} A function that returns some notion of numerical
 *    distance between 2 nodes. Default: :func:`distance`
 * @return {Array} An Array of Arrays, with each Array containing all the
 *     nodes in one cluster. Note that neither the clusters nor the nodes are
 *     in any particular order. You may find :func:`domSort` helpful to remedy
 *     the latter.
 */
function clusters(fnodes, splittingDistance, getDistance = distance) {
    const matrix = new DistanceMatrix(fnodes, getDistance);
    let closest;

    while (matrix.numClusters() > 1 && (closest = matrix.closest()).distance < splittingDistance) {
        matrix.merge(closest.a, closest.b);
    }

    return matrix.clusters();
}

export {
    clusters,
    distance
};
