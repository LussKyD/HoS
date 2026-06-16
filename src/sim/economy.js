/**
 * Economy — a MONTHLY system (called once per in-game month, on day 1).
 * Days are for pacing/events; the economy moves month to month.
 * Models real fiscal flows: revenue vs spending -> deficit -> debt, with
 * debt service on top. Budget lines deliver their effect minus corruption leakage.
 * All rates here are monthly magnitudes.
 */
import { clamp } from './math.js'
import { SPEND_RATIO } from './constants.js'

export function updateEconomyMonthly(state) {
  const p = state.policy
  const e = state.econ
  const leak = 1 - p.corruption * 0.6

  // ----- Fiscal (monthly amounts) -----
  const collection = 1 - p.corruption * 0.5
  const revenue = (e.gdp * p.taxRate * collection) / 12
  const debtService = (e.debt * p.interestRate) / 12
  const programmeSpend = (e.gdp * SPEND_RATIO) / 12
  const spending = programmeSpend + debtService
  const printed = p.moneyPrinting * e.gdp * 0.004 // money printing covers part of the gap
  const deficit = spending - revenue - printed

  if (deficit > 0) e.debt += deficit
  else e.debt = Math.max(0, e.debt + deficit * 0.5) // surplus pays down debt at half rate

  // ----- Growth (monthly rate) -----
  const instability = clamp(state.stocks.unrest * 0.6 + state.stocks.coupRisk * 0.4, 0, 1)
  const debtBurden = Math.max(0, e.debtToGdp - 0.8) * 0.01
  const gdpGrowth = clamp(
    0.0035 +
      p.infraBudget * leak * 0.006 +
      p.eduBudget * leak * 0.0035 +
      p.foreignInvestment * 0.004 -
      p.corruption * 0.004 -
      instability * 0.006 -
      p.interestRate * 0.02 -
      debtBurden,
    -0.03, 0.03,
  )
  const nextGdp = Math.max(1, e.gdp * (1 + gdpGrowth))

  // ----- Inflation (level) -----
  const deficitPressure = Math.max(0, deficit / e.gdp) * 4
  const inflation = clamp(
    0.02 + p.moneyPrinting * 0.08 + state.shocks.supply * 0.03 + deficitPressure - p.interestRate * 0.4,
    0, 0.5,
  )

  // ----- Unemployment (from annualized growth) -----
  const unemployment = clamp(0.07 - gdpGrowth * 12 * 0.4, 0.02, 0.35)

  e.revenue = revenue
  e.spending = spending
  e.deficit = deficit
  e.gdp = nextGdp
  e.gdpGrowth = gdpGrowth
  e.inflation = inflation
  e.unemployment = unemployment
  e.debtToGdp = e.debt / nextGdp

  e.history.push({
    year: state.time.year, month: state.time.month,
    gdp: nextGdp, inflation, unemployment, debtToGdp: e.debtToGdp,
  })
  if (e.history.length > 120) e.history.shift()
}
