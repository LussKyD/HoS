/**
 * Orchestrator. Holds the single state object, advances it one day per tick,
 * and exposes the player actions. The tick order is deliberate:
 *   time -> economy -> compute targets -> EASE STOCKS -> regions/intl -> events
 * Stocks are eased toward targets (never hard-assigned), so action bumps and
 * event hits persist and decay instead of being wiped each tick.
 */
import { createInitialState, normalizePie } from './state.js'
import { updateEconomyMonthly } from './economy.js'
import { computeSociety } from './society.js'
import { computePower } from './power.js'
import { runEvents } from './events.js'
import { createRng, pick } from './rng.js'
import { clamp, approach } from './math.js'
import {
  EASE, POLICIES, PIE_IDS, REGIONS, COUNTRY_IDS, COUNTRIES,
  DAYS_PER_MONTH, MONTHS_PER_YEAR, BUDGET_MONTH,
} from './constants.js'

function clone(v) {
  return typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v))
}
const COOLDOWN = (months) => months * DAYS_PER_MONTH
const POLICY_BY_ID = Object.fromEntries(POLICIES.map((p) => [p.id, p]))

export function createEngine({ seed = 1, initialState } = {}) {
  const rng = createRng(seed)
  const state = initialState ? migrate(clone(initialState), seed) : createInitialState(seed)

  function addEvent(message, type = 'news', dossierId) {
    const ev = { id: `ev-${state.time.tick}-${state.events.length}`, at: { ...state.time }, type, message }
    if (dossierId) ev.dossierId = dossierId
    state.events.push(ev)
    if (state.events.length > 60) state.events.splice(0, state.events.length - 60)
  }
  function addDossier({ title, summary, details, type = 'brief', countryId = null }) {
    const id = `dos-${state.time.tick}-${state.dossiers.length}`
    state.dossiers.push({ id, title, summary, details, type, countryId, at: { ...state.time } })
    if (state.dossiers.length > 30) state.dossiers.shift()
    return id
  }
  function onCooldown(key, months) {
    const last = state.cooldowns[key] ?? -99999
    return state.time.tick - last < COOLDOWN(months)
  }
  function setCooldown(key) { state.cooldowns[key] = state.time.tick }
  const inPower = () => state.regime.status === 'in_power'

  // ---------------------------------------------------------------- tick
  function tick() {
    if (!inPower()) return
    state.time.tick += 1
    if (++state.time.day > DAYS_PER_MONTH) {
      state.time.day = 1
      if (++state.time.month > MONTHS_PER_YEAR) { state.time.month = 1; state.time.year += 1 }
    }

    state.shocks.supply = clamp(state.shocks.supply * 0.85 + (rng() - 0.5) * 0.05, 0, 1)

    if (state.time.day === 1) updateEconomyMonthly(state)
    const soc = computeSociety(state)
    const pow = computePower(state)

    // EASE every stock toward its target — the persistence mechanism.
    const s = state.stocks
    s.approval = clamp(approach(s.approval, soc.approvalTarget, EASE.approval), 0, 1)
    s.unrest = clamp(approach(s.unrest, soc.unrestTarget, EASE.unrest), 0, 1)
    s.militaryLoyalty = clamp(approach(s.militaryLoyalty, pow.militaryLoyaltyTarget, EASE.militaryLoyalty), 0, 1)
    s.eliteConfidence = clamp(approach(s.eliteConfidence, pow.eliteConfidenceTarget, EASE.eliteConfidence), 0, 1)
    s.coupRisk = clamp(approach(s.coupRisk, pow.coupRiskTarget, EASE.coupRisk), 0, 1)
    s.parliamentSupport = clamp(approach(s.parliamentSupport, pow.parliamentSupportTarget, EASE.parliamentSupport), 0.1, 0.95)
    s.oppositionStrength = clamp(approach(s.oppositionStrength, pow.oppositionStrengthTarget, EASE.oppositionStrength), 0.1, 0.9)

    state.drivers = { approval: soc.approvalDrivers, coup: pow.coupDrivers, unrest: soc.unrestDrivers }

    // Regions ease toward the national mood with a little local variance.
    REGIONS.forEach((id) => {
      const drift = approach(state.regions[id] ?? 0.5, s.approval, EASE.region)
      state.regions[id] = clamp(drift + (rng() - 0.5) * 0.015, 0.05, 0.95)
    })

    // International relations drift; average relation feeds foreign interference.
    const avg = COUNTRY_IDS.reduce((a, id) => a + (state.intl.relations[id] ?? 0.5), 0) / COUNTRY_IDS.length
    const foreignTarget = clamp((0.5 - avg) * 0.6 + 0.08, 0.05, 0.8)
    state.shocks.foreignInterference = clamp(approach(state.shocks.foreignInterference, foreignTarget, 0.05), 0.05, 0.95)
    COUNTRY_IDS.forEach((id) => {
      state.intl.relations[id] = clamp((state.intl.relations[id] ?? 0.5) + (rng() - 0.5) * 0.008, 0.15, 0.9)
    })

    // Calendar: budget due once a year.
    if (state.time.day === 1) {
      if (state.time.month === 1) state.cooldowns.budgetTabledYear = null
      if (state.time.month === BUDGET_MONTH && state.cooldowns.budgetTabledYear == null) {
        state.cooldowns.budgetDue = true
        addEvent('Budget day \u2014 table your budget in Parliament.', 'calendar')
      }
      if (state.time.month === 1) addEvent(`Year ${state.time.year} begins.`, 'calendar')
    }

    runEvents(state, rng, { addEvent })
  }

  // ---------------------------------------------------------------- actions
  function applyPolicy(id, value) {
    const def = POLICY_BY_ID[id]
    if (!def) return
    const v = clamp(Number(value), def.min, def.max)
    state.policy[id] = v
    if (PIE_IDS.includes(id)) {
      const others = PIE_IDS.filter((x) => x !== id)
      const sumOthers = others.reduce((sm, x) => sm + (state.policy[x] ?? 0), 0)
      const remaining = 1 - v
      if (sumOthers > 0 && remaining >= 0) {
        others.forEach((x) => { state.policy[x] = clamp((state.policy[x] / sumOthers) * remaining, 0, 1) })
      }
    }
  }
  function setPolicies(policies) {
    Object.entries(policies).forEach(([k, val]) => {
      const def = POLICY_BY_ID[k]; if (def) state.policy[k] = clamp(Number(val), def.min, def.max)
    })
    normalizePie(state.policy)
  }

  /** Bump a stock and leave a record. The bump persists because easing is gradual. */
  function bump(stock, delta) { state.stocks[stock] = clamp(state.stocks[stock] + delta, 0, 1) }

  function addressNation() {
    if (!inPower() || onCooldown('address', 12)) return
    setCooldown('address')
    const positive = state.stocks.approval >= 0.4
    bump('approval', positive ? 0.05 : -0.02)
    bump('oppositionStrength', positive ? -0.02 : 0.02)
    const summary = positive ? 'State of the Nation: well received. Approval rises.' : 'State of the Nation: lukewarm. Approval dips.'
    addEvent(summary, 'address', addDossier({ title: 'State of the Nation brief', summary, details: 'Address delivered to Parliament.', type: 'address' }))
  }
  function pressConference() {
    if (!inPower() || onCooldown('press', 6)) return
    setCooldown('press')
    const positive = state.stocks.approval >= 0.45
    bump('approval', positive ? 0.03 : -0.015)
    const summary = positive ? 'Press conference: message lands. Approval up.' : 'Press conference: tough room. Approval slips.'
    addEvent(summary, 'press', addDossier({ title: 'Press conference brief', summary, details: 'Questions taken; headline set.', type: 'press' }))
  }
  function cabinetMeeting() {
    if (!inPower() || onCooldown('cabinet', 6)) return
    setCooldown('cabinet')
    const success = state.stocks.approval >= 0.42
    bump('approval', success ? 0.02 : -0.01)
    bump('eliteConfidence', success ? 0.02 : -0.01)
    const summary = success ? 'Cabinet meeting: ministers align behind the agenda.' : 'Cabinet meeting: divisions surface.'
    addEvent(summary, 'cabinet', addDossier({ title: 'Cabinet meeting brief', summary, details: 'Agenda reviewed.', type: 'cabinet' }))
  }
  function securityBriefing() {
    if (!inPower() || onCooldown('security', 6)) return
    setCooldown('security')
    bump('militaryLoyalty', 0.03)
    bump('coupRisk', -0.03)
    const summary = 'Security briefing: threat posture reviewed. Coup risk eased.'
    addEvent(summary, 'security', addDossier({ title: 'Security briefing brief', summary, details: 'Intel reviewed; loyalty reinforced.', type: 'security' }))
  }
  function visitRegion(regionId) {
    if (!inPower() || !REGIONS.includes(regionId) || onCooldown('visit', 6)) return
    setCooldown('visit')
    state.regions[regionId] = clamp((state.regions[regionId] ?? 0.5) + 0.06, 0.05, 0.95)
    bump('approval', 0.01)
    const summary = `Presidential visit to ${regionId} lifts local support.`
    addEvent(summary, 'visit', addDossier({ title: `Visit brief \u2014 ${regionId}`, summary, details: `Rally and meetings in ${regionId}.`, type: 'visit' }))
  }
  function launchInfrastructure(regionId) {
    if (!inPower() || !REGIONS.includes(regionId) || onCooldown('infra', 6)) return
    setCooldown('infra')
    state.regions[regionId] = clamp((state.regions[regionId] ?? 0.5) + 0.05, 0.05, 0.95)
    bump('approval', 0.015)
    bump('eliteConfidence', 0.01)
    const summary = `Infrastructure launched in ${regionId}. Approval rises.`
    addEvent(summary, 'infra', addDossier({ title: `Infrastructure launch \u2014 ${regionId}`, summary, details: `Ribbon-cutting in ${regionId}.`, type: 'infra' }))
  }
  function meetForeignLeader(countryId) {
    if (!inPower() || !COUNTRY_IDS.includes(countryId) || onCooldown('foreign', 6)) return
    setCooldown('foreign')
    state.intl.relations[countryId] = clamp((state.intl.relations[countryId] ?? 0.5) + 0.08, 0.15, 0.9)
    state.shocks.foreignInterference = clamp(state.shocks.foreignInterference - 0.02, 0.05, 0.95)
    const name = COUNTRIES.find((c) => c.id === countryId)?.name ?? countryId
    const summary = `Bilateral meeting with ${name}: relations improve.`
    addEvent(summary, 'foreign', addDossier({ title: `Bilateral brief \u2014 ${name}`, summary, details: 'State visit concluded.', type: 'foreign', countryId }))
  }
  function tableBudget() {
    if (!inPower() || state.cooldowns.budgetTabledYear != null) return
    state.cooldowns.budgetTabledYear = state.time.year
    state.cooldowns.budgetDue = false
    const roll = rng()
    const support = state.stocks.parliamentSupport
    let summary
    if (roll < support) { bump('approval', 0.02); bump('oppositionStrength', -0.02); summary = 'Parliament passes your budget.' }
    else if (roll < support + 0.2) { bump('approval', -0.01); summary = 'Parliament amends your budget.' }
    else { bump('approval', -0.05); bump('coupRisk', 0.03); bump('oppositionStrength', 0.03); summary = 'Parliament rejects your budget.' }
    addEvent(summary, 'parliament', addDossier({ title: 'Budget vote brief', summary, details: 'Budget tabled in Parliament.', type: 'parliament' }))
  }
  function respondToCrisis(response) {
    const pending = state.crisis?.pendingResponse
    if (!pending || !inPower()) return
    state.crisis = null
    if (pending.type === 'protest') {
      const region = pending.region
      const bumpRegion = (d) => { if (region && state.regions[region] != null) state.regions[region] = clamp(state.regions[region] + d, 0.05, 0.95) }
      const map = {
        dialogue: () => { bump('approval', 0.02); bump('unrest', -0.05); bumpRegion(0.04); return 'Dialogue with protesters. Tensions ease.' },
        crackdown: () => { bump('approval', -0.06); bump('coupRisk', 0.04); bump('unrest', 0.03); bumpRegion(-0.1); return 'Crackdown ordered. Approval drops; unrest grows.' },
        ignore: () => { bump('approval', -0.03); bump('unrest', 0.02); bumpRegion(-0.05); return 'No response. Some lose faith.' },
        address: () => { bump('approval', 0.01); bump('unrest', -0.03); bumpRegion(0.02); return 'You addressed the nation. Calm returns.' },
      }
      const summary = (map[response] || map.ignore)()
      addEvent(summary, 'crisis', addDossier({ title: 'Protest response brief', summary, details: `Response to unrest in ${region}.`, type: 'crisis' }))
    } else if (pending.type === 'scandal') {
      const map = {
        deny: () => { bump('approval', -0.02); bump('oppositionStrength', 0.02); return 'You denied the allegations. Media skeptical.' },
        investigate: () => { bump('approval', 0.01); bump('oppositionStrength', -0.01); return 'You ordered an inquiry. Public sees accountability.' },
        ignore: () => { bump('approval', -0.04); bump('oppositionStrength', 0.03); return 'No comment. The story drags on.' },
      }
      const summary = (map[response] || map.ignore)()
      addEvent(summary, 'crisis', addDossier({ title: 'Scandal response brief', summary, details: 'Response to corruption allegations.', type: 'crisis' }))
    }
  }

  return {
    getState: () => clone(state),
    tick, applyPolicy, setPolicies,
    addressNation, pressConference, cabinetMeeting, securityBriefing,
    visitRegion, launchInfrastructure, meetForeignLeader, tableBudget, respondToCrisis,
  }
}

/** Bring older saves up to the current shape. */
function migrate(s, seed) {
  if (!s.meta) s.meta = { seed, version: 2 }
  s.meta.seed = seed
  if (!s.cooldowns) s.cooldowns = {}
  if (!s.dossiers) s.dossiers = []
  if (!s.drivers) s.drivers = { approval: [], coup: [], unrest: [] }
  if (!s.stance) s.stance = { economicLeft: 0.5, authority: 0.4 }
  return s
}
