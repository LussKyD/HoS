/** Builds the single source-of-truth state object. */
import { INITIAL, START_YEAR, POLICY_DEFAULTS, PIE_IDS, REGIONS, COUNTRY_IDS } from './constants.js'
import { clamp } from './math.js'

function regionMap(v) {
  return REGIONS.reduce((acc, id) => ((acc[id] = v), acc), {})
}
function relationMap(v) {
  return COUNTRY_IDS.reduce((acc, id) => ((acc[id] = v), acc), {})
}

/** Renormalize the six spending-pie lines so they sum to 1. */
export function normalizePie(policy) {
  const sum = PIE_IDS.reduce((s, id) => s + Math.max(0, policy[id] ?? 0), 0)
  if (sum <= 0) return
  PIE_IDS.forEach((id) => { policy[id] = clamp((policy[id] ?? 0) / sum, 0, 1) })
}

export function createInitialState(seed = 1) {
  const policy = { ...POLICY_DEFAULTS }
  normalizePie(policy)
  return {
    meta: { seed, version: 2 },
    time: { tick: 0, day: 1, month: 1, year: START_YEAR },
    policy,
    econ: {
      gdp: INITIAL.gdp,
      gdpGrowth: 0,
      inflation: INITIAL.inflation,
      unemployment: INITIAL.unemployment,
      debt: INITIAL.debt,
      treasury: INITIAL.treasury,
      revenue: 0,
      spending: 0,
      deficit: 0,
      debtToGdp: INITIAL.debt / INITIAL.gdp,
      history: [],
    },
    // Persistent stocks — eased toward targets, nudged by actions.
    stocks: {
      approval: INITIAL.approval,
      coupRisk: INITIAL.coupRisk,
      militaryLoyalty: INITIAL.militaryLoyalty,
      eliteConfidence: INITIAL.eliteConfidence,
      unrest: INITIAL.unrest,
      parliamentSupport: INITIAL.parliamentSupport,
      oppositionStrength: INITIAL.oppositionStrength,
    },
    shocks: { supply: 0, foreignInterference: INITIAL.foreignInterference },
    stance: { economicLeft: 0.5, authority: 0.4 },
    regions: regionMap(INITIAL.regionApproval),
    intl: { relations: relationMap(INITIAL.relation) },
    drivers: { approval: [], coup: [], unrest: [] },
    crisis: null,
    regime: { status: 'in_power', endReason: null, term: 1 },
    cooldowns: {},
    events: [],
    dossiers: [],
  }
}
