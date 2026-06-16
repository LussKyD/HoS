/**
 * Power: targets for military loyalty, elite confidence, coup risk,
 * parliament support and opposition strength. Coup risk is built from the
 * *current* (already-eased) loyalty and elite stocks, so it responds with
 * realistic lag — a single good security briefing dents it but doesn't erase it.
 */
import { clamp } from './math.js'

export function computePower(state) {
  const p = state.policy
  const s = state.stocks
  const e = state.econ
  const foreign = state.shocks.foreignInterference

  const militaryLoyaltyTarget = clamp(
    0.6 + p.defenseBudget * 0.5 + p.corruption * 0.08 - foreign * 0.35 - Math.max(0, s.unrest - 0.5) * 0.3,
    0.05, 0.95,
  )

  const eliteConfidenceTarget = clamp(
    0.35 + e.gdpGrowth * 12 * 0.6 + (1 - p.corruption) * 0.2 + p.foreignInvestment * 0.15 - e.inflation * 1.2,
    0.05, 0.95,
  )

  const coupRiskTarget = clamp(
    (1 - s.militaryLoyalty) * 0.35 +
      (1 - s.eliteConfidence) * 0.15 +
      s.unrest * 0.25 +
      foreign * 0.15,
    0, 1,
  )

  const parliamentSupportTarget = clamp(s.approval * 0.7 + 0.15, 0.1, 0.95)
  const oppositionStrengthTarget = clamp(0.2 + (1 - s.approval) * 0.6, 0.12, 0.9)

  const coupDrivers = [
    { id: 'military', label: 'Military disloyalty', effect: (1 - s.militaryLoyalty) * 0.35 },
    { id: 'elite', label: 'Elite doubt', effect: (1 - s.eliteConfidence) * 0.15 },
    { id: 'unrest', label: 'Street unrest', effect: s.unrest * 0.25 },
    { id: 'foreign', label: 'Foreign interference', effect: foreign * 0.15 },
  ]

  return {
    militaryLoyaltyTarget, eliteConfidenceTarget, coupRiskTarget,
    parliamentSupportTarget, oppositionStrengthTarget, coupDrivers,
  }
}
