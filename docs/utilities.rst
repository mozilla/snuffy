=================
Utility Functions
=================

In addition to components intrinsically tied to rulesets, Fathom comes with a variety of utility procedures for building scoring and other callback functions or just for improving the imperative shell around your ruleset.

Import them from ``fathom-web/utils``. For example...

   .. code-block:: js

      const {best} = require('fathom-web/utils');

.. autofunction:: ancestors
.. autofunction:: attributesMatch
.. autofunction:: best
.. autofunction:: collapseWhitespace
.. autofunction:: domSort
.. autofunction:: first
.. autofunction:: getDefault
.. autofunction:: identity
.. autofunction:: inlineTextLength
.. autofunction:: inlineTexts
.. autofunction:: isBlock
.. autofunction:: isVisible
.. autofunction:: isWhitespace
.. autofunction:: length
.. autofunction:: linearScale
.. autofunction:: linkDensity
.. autofunction:: utilsForFrontend.max
   :short-name:
.. autofunction:: maxes
.. autofunction:: min
.. autoclass:: NiceSet
   :members:
.. autofunction:: numberOfMatches
.. autofunction:: page
.. autofunction:: reversed
.. autofunction:: rgbaFromString
.. autofunction:: rootElement
.. autofunction:: saturation
.. autofunction:: setDefault
.. autofunction:: sigmoid
.. autofunction:: sum
.. autofunction:: toposort
.. autofunction:: walk
