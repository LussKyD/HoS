/**
 * Society: derives the player's effective ideological stance from their policies,
 * then computes the *target* approval and unrest the population is drifting toward.
 * Returns targets + driver breakdowns (the cause-effect transparency that makes
 * this not a spreadsheet). The engine eases the real stocks toward these.
 */
import { clamp } from './math.js'

export function computeSociety(state) {
  const p = state.policy
  const e = state.econ

  // Effective stance, read off the policies (replaces the old hardcoded 0.5).
  const economicLeft = clamp(p.welfareBudget * 0.4 + p.healthBudget * 0.35 + p.taxRate * 0.6, 0, 1)
  const authority = clamp(p.policeBudget * 0.4 + p.defenseBudget * 0.2 + (1 - p.pressFreedom) * 0.5 + p.corruption * 0.2, 0, 1)
  state.stance = { economicLeft, authority }

  const leak = 1 - p.corruption * 0.6

  const economy = clamp(1 - e.inflation * 1.8 - e.unemployment * 2.2, 0, 1)
  const services = clamp((p.healthBudget + p.eduBudget + p.welfareBudget) * leak * 1.1, 0, 1)
  const liberty = clamp(p.pressFreedom * 0.7 + (1 - authority) * 0.3, 0, 1)
  const corruptionAnger = p.corruption

  const approvalTarget = clamp(
    0.12 +
      economy * 0.4 +
      services * 0.22 +
      liberty * 0.14 -
      corruptionAnger * 0.25 -
      state.stocks.unrest * 0.15,
    0, 1,
  )

  // Heavy authority can suppress unrest a little but also inflame it past a point.
  const repression = p.policeBudget * 0.4
  const overreach = Math.max(0, authority - 0.7) * 0.4
  const unrestTarget = clamp(
    e.unemployment * 1.5 +
      e.inflation * 2 +
      p.corruption * 0.6 +
      overreach -
      repression -
      services * 0.3,
    0, 1,
  )

  const approvalDrivers = [
    { id: 'economy', label: 'Cost of living & jobs', effect: economy * 0.4 },
    { id: 'services', label: 'Public services', effect: services * 0.22 },
    { id: 'liberty', label: 'Freedoms & press', effect: liberty * 0.14 },
    { id: 'corruption', label: 'Corruption', effect: -corruptionAnger * 0.25 },
    { id: 'unrest', label: 'Unrest', effect: -state.stocks.unrest * 0.15 },
  ]
  const unrestDrivers = [
    { id: 'jobs', label: 'Unemployment', effect: e.unemployment * 1.5 },
    { id: 'prices', label: 'Inflation', effect: e.inflation * 2 },
    { id: 'graft', label: 'Corruption', effect: p.corruption * 0.6 },
    { id: 'police', label: 'Policing', effect: -repression },
    { id: 'services', label: 'Services', effect: -services * 0.3 },
  ]

  return { approvalTarget, unrestTarget, approvalDrivers, unrestDrivers }
}
