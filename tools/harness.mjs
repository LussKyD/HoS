/** Headless verification: runs simulations and prints the trajectory. No UI. */
import { createEngine } from '../src/sim/engine.js'
import { PRESETS } from '../src/sim/constants.js'

const pct = (v) => `${(v * 100).toFixed(0)}%`
const f2 = (v) => v.toFixed(2)

function row(st) {
  const s = st.stocks, e = st.econ
  return `Y${st.time.year} M${String(st.time.month).padStart(2)} | appr ${pct(s.approval)} coup ${pct(s.coupRisk)} loyal ${pct(s.militaryLoyalty)} unrest ${pct(s.unrest)} | gdp ${e.gdp.toFixed(0)} infl ${pct(e.inflation)} unemp ${pct(e.unemployment)} debt/gdp ${pct(e.debtToGdp)}`
}
function assert(cond, msg) { if (!cond) { console.error('  ✗ FAIL:', msg); process.exitCode = 1 } else console.log('  ✓', msg) }

// ---------- 1. Default policy, 6 years, sanity + no NaN ----------
console.log('\n=== TEST 1: Default governance, 6 years ===')
{
  const eng = createEngine({ seed: 7 })
  for (let y = 0; y < 6; y++) {
    for (let i = 0; i < 84; i++) eng.tick()        // 84 days = 1 year
    const st = eng.getState()
    console.log('  ' + row(st))
    const vals = [st.stocks.approval, st.stocks.coupRisk, st.econ.gdp, st.econ.inflation, st.econ.debtToGdp]
    assert(vals.every(Number.isFinite), `year ${y + 1}: all values finite`)
  }
}

// ---------- 2. Persistence: a speech bump must survive, then decay ----------
console.log('\n=== TEST 2: Actions persist (the core fix) ===')
{
  const eng = createEngine({ seed: 3 })
  for (let i = 0; i < 200; i++) eng.tick()          // settle to baseline
  const before = eng.getState().stocks.approval
  eng.addressNation()
  const justAfter = eng.getState().stocks.approval
  eng.tick()
  const nextDay = eng.getState().stocks.approval
  for (let i = 0; i < 30; i++) eng.tick()
  const later = eng.getState().stocks.approval
  console.log(`  baseline ${f2(before)} -> after speech ${f2(justAfter)} -> next day ${f2(nextDay)} -> 30 days later ${f2(later)}`)
  assert(justAfter > before + 0.03, 'speech raises approval immediately')
  assert(nextDay > before + 0.02, 'bump SURVIVES the next tick (old engine wiped it here)')
  assert(later < justAfter, 'bump decays over time toward baseline')
}

// ---------- 3. Treasury / debt responds to fiscal policy ----------
console.log('\n=== TEST 3: Fiscal layer (debt responds to tax & rates) ===')
{
  const thrifty = createEngine({ seed: 5 })
  thrifty.applyPolicy('taxRate', 0.45)
  thrifty.applyPolicy('moneyPrinting', 0.05)
  const reckless = createEngine({ seed: 5 })
  reckless.applyPolicy('taxRate', 0.1)
  reckless.applyPolicy('moneyPrinting', 0.6)
  for (let i = 0; i < 84 * 4; i++) { thrifty.tick(); reckless.tick() }
  const t = thrifty.getState().econ, r = reckless.getState().econ
  console.log(`  thrifty: debt/gdp ${pct(t.debtToGdp)} infl ${pct(t.inflation)} | reckless: debt/gdp ${pct(r.debtToGdp)} infl ${pct(r.inflation)}`)
  assert(r.debtToGdp > t.debtToGdp, 'low tax -> higher debt burden')
  assert(r.inflation > t.inflation, 'heavy money printing -> higher inflation')
}

// ---------- 4. Mismanagement leads to a fall (coup or voted out) ----------
console.log('\n=== TEST 4: Strongman misrule can end a regime ===')
{
  let fell = false, reason = '', when = ''
  for (let seed = 1; seed <= 6 && !fell; seed++) {
    const eng = createEngine({ seed })
    eng.setPolicies(PRESETS.strongman.policies)
    eng.applyPolicy('corruption', 0.7)
    eng.applyPolicy('defenseBudget', 0.05)
    for (let i = 0; i < 84 * 8; i++) {
      eng.tick()
      const st = eng.getState()
      if (st.regime.status !== 'in_power') { fell = true; reason = st.regime.endReason; when = `Y${st.time.year} M${st.time.month}`; break }
    }
  }
  console.log(`  outcome: ${fell ? `regime fell (${reason}) at ${when}` : 'survived all seeds'}`)
  assert(fell, 'extreme misrule produces a regime change within 8 years on some seed')
}

// ---------- 5. Determinism ----------
console.log('\n=== TEST 5: Same seed -> same run ===')
{
  const a = createEngine({ seed: 42 }); const b = createEngine({ seed: 42 })
  for (let i = 0; i < 300; i++) { a.tick(); b.tick() }
  assert(JSON.stringify(a.getState().stocks) === JSON.stringify(b.getState().stocks), 'identical seeds produce identical state')
}

console.log('\nDone.', process.exitCode ? 'SOME TESTS FAILED.' : 'All checks passed.')
