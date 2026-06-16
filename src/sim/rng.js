/** Seeded RNG so a given seed always produces the same run (for balance + bug repro). */

function toUint32Seed(seed) {
  if (typeof seed === 'number' && Number.isFinite(seed)) return seed >>> 0
  const s = String(seed ?? '')
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Mulberry32: fast, deterministic, good enough for gameplay randomness.
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createRng(seed = 1) {
  return mulberry32(toUint32Seed(seed))
}

/** Pick a random element from an array using the provided rng. */
export function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)]
}
