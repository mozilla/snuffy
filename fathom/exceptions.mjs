/**
 * A :func:`rule` depends on another rule which itself depends on the first
 * rule again, either directly or indirectly.
 */
export class CycleError extends Error {
}

/**
  * An examined element was not contained in a browser ``window`` object, but
  * something needed it to be.
  */
export class NoWindowError extends Error {
}
