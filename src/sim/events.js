/**
 * Emergent events. Probabilistic, driven by the simulation's own state.
 * Effects bump persistent stocks directly — and because stocks ease (not reset),
 * a bump sticks then fades, so events leave a real mark on the trajectory.
 */
import { clamp } from './math.js'
import { pick } from './rng.js'
import { REGIONS, COUNTRY_IDS, COUP_THRESHOLD, ELECTION_INTERVAL_MONTHS, START_YEAR } from './constants.js'

const PROTEST = [
  (r) => `Protest in ${r}: anger over prices and graft.`,
  (r) => `${r} rallies against the cost of living.`,
  (r) => `Demonstrations spread through ${r}.`,
]
const SCANDAL = [
  'Leak ties officials to procurement kickbacks.',
  'Front pages: "Corruption at the top."',
  'Opposition demands an inquiry into contracts.',
]
const DIPLOMATIC = [
  'Diplomatic incident: an ally condemns a policy shift.',
  'Embassy row dents the country\u2019s standing.',
  'A partner state recalls its envoy.',
]
const DEBT = [
  'Bond markets balk; borrowing costs climb.',
  'Ratings agency warns on the debt path.',
  'IMF signals concern over the deficit.',
]
const COUP = [
  'Coup attempt succeeds. You are removed from power.',
  'Generals seize the palace. Your term ends tonight.',
  'The armed forces take control.',
]
const WIN = ['Election: you win another term.', 'Election: a narrow victory; opposition gains.']
const LOSE = ['Election: voters choose change. You concede.', 'Election: defeat at the polls.']
const PRAISE = ['Business leaders praise the economy.', 'Markets steady as growth holds.']
const BOUNCE = ['Polls: the public mood lifts.', 'Approval ticks up as promises land.']

export function runEvents(state, rng, helpers) {
  if (state.regime.status !== 'in_power') return
  const { addEvent } = helpers
  const e = state.econ
  const s = state.stocks

  // ----- Coup attempt -----
  if (s.coupRisk >= COUP_THRESHOLD && rng() < (s.coupRisk - COUP_THRESHOLD) * 1.5) {
    state.regime.status = 'coup'
    state.regime.endReason = 'Removed by a military coup.'
    s.coupRisk = 1
    addEvent(pick(COUP, rng), 'coup')
    return
  }

  // ----- Elections every 4 years: you vs opposition + swing -----
  const monthsInOffice = (state.time.year - START_YEAR) * 12 + (state.time.month - 1)
  if (monthsInOffice > 0 && monthsInOffice % ELECTION_INTERVAL_MONTHS === 0 && state.time.day === 1) {
    const swing = (rng() - 0.5) * 0.2
    const lost = s.oppositionStrength + swing > s.approval
    addEvent(pick(lost ? LOSE : WIN, rng), 'election')
    if (lost) {
      state.regime.status = 'voted_out'
      state.regime.endReason = 'Lost the national election.'
      return
    }
    state.regime.term += 1
  }

  // ----- Protest (unrest-driven). Sets a pending response the player must answer. -----
  const protestChance = clamp(s.unrest * 0.12 - state.policy.policeBudget * 0.03, 0, 0.3)
  if (rng() < protestChance) {
    const region = REGIONS[Math.floor(rng() * REGIONS.length)]
    const message = pick(PROTEST, rng)(region)
    if (!state.crisis?.pendingResponse) {
      state.crisis = { pendingResponse: { type: 'protest', region, message } }
      addEvent(message, 'protest')
    } else {
      addEvent(message, 'protest')
      s.approval = clamp(s.approval - 0.03, 0, 1)
      s.unrest = clamp(s.unrest + 0.04, 0, 1)
      if (state.regions[region] != null) state.regions[region] = clamp(state.regions[region] - 0.05, 0.05, 0.95)
    }
  }

  // ----- Scandal (corruption-driven). Can also demand a response. -----
  if (state.policy.corruption >= 0.35 && rng() < 0.08) {
    const message = pick(SCANDAL, rng)
    if (!state.crisis?.pendingResponse) {
      state.crisis = { pendingResponse: { type: 'scandal', message } }
      addEvent(message, 'scandal')
    } else {
      addEvent(message, 'scandal')
      s.approval = clamp(s.approval - 0.03, 0, 1)
      s.oppositionStrength = clamp(s.oppositionStrength + 0.03, 0.1, 0.9)
    }
  }

  // ----- Debt crisis -----
  if (e.debtToGdp > 1.0 && rng() < 0.06) {
    addEvent(pick(DEBT, rng), 'economic')
    s.approval = clamp(s.approval - 0.02, 0, 1)
    s.eliteConfidence = clamp(s.eliteConfidence - 0.04, 0, 1)
  }

  // ----- Diplomatic incident -----
  if (rng() < 0.04) {
    addEvent(pick(DIPLOMATIC, rng), 'diplomatic')
    state.shocks.foreignInterference = clamp(state.shocks.foreignInterference + 0.05, 0, 1)
    const hit = COUNTRY_IDS[Math.floor(rng() * COUNTRY_IDS.length)]
    state.intl.relations[hit] = clamp((state.intl.relations[hit] ?? 0.5) - 0.06, 0.15, 0.9)
  }

  // ----- Positive beats -----
  if (s.approval >= 0.55 && rng() < 0.06) {
    addEvent(pick(BOUNCE, rng), 'good')
    s.approval = clamp(s.approval + 0.01, 0, 1)
  }
  if (e.gdpGrowth > 0.025 && rng() < 0.07) {
    addEvent(pick(PRAISE, rng), 'good')
    s.eliteConfidence = clamp(s.eliteConfidence + 0.015, 0, 1)
  }
}
