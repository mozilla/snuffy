==========
Clustering
==========

One of Fathom's most powerful features is its flexible clustering algorithm, which groups nodes based on their proximity and ancestry. It is documented here as top-level functions but is also available directly within rulesets as :func:`bestCluster`, which has the advantage of letting you direct its results to further rules. Clustering is computationally expensive (at least O(n^2)) but widely applicable.

.. autofunction:: clusters

   Example:

   .. code-block:: js

      const {clusters} = require('fathom-web/clusters');
      theClusters = clusters(anArrayOfNodes, 4);

   In the above, 4 is the distance beyond which Fathom will decide nodes belong in separate clusters. Turn it up to more aggressively invite nearby nodes into a cluster. Turn it down to keep clusters smaller. The output looks like a list of lists, with each list representing a cluster:

   .. code-block:: js

      [[nodeA, nodeB, nodeC],
       [nodeD]]

   Various factors influence the measured distance between nodes. The first is the obvious one: topological distance, the number of steps along the DOM tree from one node to another.

   The second is structural similarity. In the following, the divs ``a`` and ``b`` are farther apart…

   .. code-block:: html

      <center>
          <div id="a">
          </div>
      </center>
      <div>
          <div id="b">
          </div>
      </div>

   …than they would be if the ``center`` tag were a ``div`` as well:

   .. code-block:: html

      <div>
          <div id="a">
          </div>
      </div>
      <div>
          <div id="b">
          </div>
      </div>

   Third is depth disparity. Nodes are considered farther from each other if they are not the same distance from the root.

   Finally is the presence of "stride" nodes, which are (1) siblings or (2) siblings of ancestors that lie
   between 2 nodes. (These are the nodes that would appear between the 2 nodes in a straightforward rendering of the page.) Each stride node makes it less likely that the 2 nodes will be together in a cluster.

   The costs for each factor can be customized by wrapping :func:`distance` in an arrow function and passing it as the third param.

   .. note::

        ``clusters()`` can actually cluster anything, not just DOM nodes. All you need to do is pass in a suitable distance function as the ``getDistance`` param.

.. autofunction:: distance(fnodeA, fnodeB, {differentDepthCost = 2, differentTagCost = 2, sameTagCost = 1, strideCost = 1, additionalCost = (fnodeA, fnodeB) => 0})
