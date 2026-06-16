/**
 * All tunable numbers live here so balance is data, not code.
 * Time: 1 tick = 1 day, 7 days = 1 month, 12 months = 1 year.
 */

export const DAYS_PER_MONTH = 7
export const MONTHS_PER_YEAR = 12
export const START_YEAR = 2026

/** Initial values for the persistent stocks and economy. */
export const INITIAL = {
  gdp: 1000,            // abstract national output units
  inflation: 0.03,
  unemployment: 0.06,
  debt: 250,            // debt-to-GDP starts at 25%
  treasury: 0,
  approval: 0.5,
  coupRisk: 0.12,
  militaryLoyalty: 0.65,
  eliteConfidence: 0.55,
  unrest: 0.2,
  parliamentSupport: 0.55,
  oppositionStrength: 0.35,
  foreignInterference: 0.12,
  regionApproval: 0.5,
  relation: 0.5,
}

/**
 * How fast each stock eases toward its target each day-tick.
 * Lower = more inertia (bumps last longer). ~0.05 means a bump
 * decays over roughly 20 days / ~3 in-game months.
 */
export const EASE = {
  approval: 0.08,
  coupRisk: 0.06,
  militaryLoyalty: 0.05,
  eliteConfidence: 0.06,
  unrest: 0.08,
  parliamentSupport: 0.04,
  oppositionStrength: 0.04,
  region: 0.05,
}

/** Government spends this share of GDP on programmes each year (debt service is on top). */
export const SPEND_RATIO = 0.28

/** Player policy levers: id, label, range, default, and what it drives (shown in UI). */
export const POLICIES = [
  { id: 'taxRate', label: 'Tax rate', min: 0, max: 0.6, step: 0.01, default: 0.3, affects: 'Revenue, growth' },
  { id: 'infraBudget', label: 'Infrastructure', min: 0, max: 1, step: 0.01, default: 0.2, affects: 'Growth', pie: true },
  { id: 'eduBudget', label: 'Education', min: 0, max: 1, step: 0.01, default: 0.15, affects: 'Growth, services', pie: true },
  { id: 'healthBudget', label: 'Health', min: 0, max: 1, step: 0.01, default: 0.15, affects: 'Approval, services', pie: true },
  { id: 'welfareBudget', label: 'Welfare', min: 0, max: 1, step: 0.01, default: 0.15, affects: 'Approval, unrest', pie: true },
  { id: 'defenseBudget', label: 'Defense', min: 0, max: 1, step: 0.01, default: 0.2, affects: 'Military loyalty', pie: true },
  { id: 'policeBudget', label: 'Police', min: 0, max: 1, step: 0.01, default: 0.15, affects: 'Unrest control', pie: true },
  { id: 'moneyPrinting', label: 'Money printing', min: 0, max: 1, step: 0.01, default: 0.15, affects: 'Inflation, deficit' },
  { id: 'interestRate', label: 'Interest rate', min: 0, max: 0.2, step: 0.005, default: 0.05, affects: 'Inflation, debt cost' },
  { id: 'pressFreedom', label: 'Press freedom', min: 0, max: 1, step: 0.01, default: 0.6, affects: 'Legitimacy, approval' },
  { id: 'corruption', label: 'Corruption tolerance', min: 0, max: 1, step: 0.01, default: 0.2, affects: 'Approval, leakage, loyalty' },
  { id: 'foreignInvestment', label: 'Foreign investment', min: 0, max: 1, step: 0.01, default: 0.4, affects: 'Growth, interference' },
]

/** The six budget lines that form one spending pie (must sum to 1). */
export const PIE_IDS = POLICIES.filter((p) => p.pie).map((p) => p.id)

export const POLICY_DEFAULTS = Object.fromEntries(POLICIES.map((p) => [p.id, p.default]))

/** Stance presets — set sliders to a coherent governing philosophy. */
export const PRESETS = {
  reformer: {
    label: 'Reformer',
    policies: { taxRate: 0.35, infraBudget: 0.22, eduBudget: 0.2, healthBudget: 0.18, welfareBudget: 0.18, defenseBudget: 0.12, policeBudget: 0.1, moneyPrinting: 0.1, interestRate: 0.04, pressFreedom: 0.85, corruption: 0.08, foreignInvestment: 0.55 },
  },
  conservative: {
    label: 'Conservative',
    policies: { taxRate: 0.25, infraBudget: 0.22, eduBudget: 0.13, healthBudget: 0.12, welfareBudget: 0.08, defenseBudget: 0.25, policeBudget: 0.2, moneyPrinting: 0.08, interestRate: 0.06, pressFreedom: 0.5, corruption: 0.18, foreignInvestment: 0.5 },
  },
  strongman: {
    label: 'Strongman',
    policies: { taxRate: 0.4, infraBudget: 0.18, eduBudget: 0.1, healthBudget: 0.1, welfareBudget: 0.1, defenseBudget: 0.32, policeBudget: 0.2, moneyPrinting: 0.3, interestRate: 0.03, pressFreedom: 0.15, corruption: 0.45, foreignInvestment: 0.35 },
  },
}

export const REGIONS = ['Capital', 'North', 'South', 'East', 'West']

export const COUNTRIES = [
  { id: 'norden', name: 'Norden', leader: 'PM Helga Voss' },
  { id: 'sudland', name: 'Sudland', leader: 'President Carlos Mbeki' },
  { id: 'eastalia', name: 'Eastalia', leader: 'Chairman Wei Lin' },
]
export const COUNTRY_IDS = COUNTRIES.map((c) => c.id)

export const ELECTION_INTERVAL_MONTHS = 48
export const BUDGET_MONTH = 3
export const COUP_THRESHOLD = 0.7
