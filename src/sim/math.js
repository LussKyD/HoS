/** Small math helpers shared across the engine. */

/** Keep a value inside [min, max]. */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

/**
 * Move `current` a fraction `rate` of the way toward `target`.
 * This is the heart of the "persistent stock" model: a stock is never
 * hard-assigned, it eases toward where the fundamentals say it should be.
 * A one-off bump (e.g. +0.05 from a speech) therefore sticks, then fades
 * over ~1/rate ticks instead of being wiped on the next tick.
 */
export function approach(current, target, rate) {
  return current + (target - current) * rate
}

/** Round to n decimals for clean display / logging. */
export function round(value, n = 2) {
  const f = 10 ** n
  return Math.round(value * f) / f
}
