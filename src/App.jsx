import { useMemo, useState, useEffect } from 'react'
import { useSimulation, SAVE_KEY } from './ui/useSimulation.js'
import { POLICIES, PIE_IDS, PRESETS, REGIONS, COUNTRIES, COUNTRY_IDS } from './sim/constants.js'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const pct = (v) => `${Math.round((v ?? 0) * 100)}%`
const money = (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v).toString()
const fmtDate = (t) => t ? `${MONTHS[(t.month ?? 1) - 1]} ${t.year} \u00b7 Day ${t.day}` : '\u2014'
const SPEEDS = [{ v: 0.5, l: '0.5\u00d7' }, { v: 1, l: '1\u00d7' }, { v: 2, l: '2\u00d7' }]

function meterColor(id, v) {
  if (id === 'coupRisk' || id === 'unrest' || id === 'oppositionStrength') return v > 0.6 ? 'var(--red)' : v > 0.4 ? 'var(--amber)' : 'var(--green)'
  return v > 0.5 ? 'var(--green)' : v > 0.35 ? 'var(--amber)' : 'var(--red)'
}

function Meter({ id, name, value, drivers }) {
  const color = meterColor(id, value)
  return (
    <div className="meter">
      <div className="head"><span className="name">{name}</span><span className="val" style={{ color }}>{pct(value)}</span></div>
      <div className="bar"><div className="fill" style={{ width: pct(value), background: color }} /></div>
      {drivers?.length > 0 && (
        <div className="drivers">
          {drivers.map((d) => {
            const w = Math.min(50, Math.abs(d.effect) * 110)
            return (
              <div className="driver" key={d.id}>
                <span className="dlabel">{d.label}</span>
                <span className="dbar"><i />
                  <span className={d.effect >= 0 ? 'dpos' : 'dneg'} style={{ width: `${w}%` }} />
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return <div className="stat"><div className="l">{label}</div><div className="n">{value}</div></div>
}

function MiniBar({ label, value }) {
  return (
    <div className="minirow">
      <span className="ml">{label}</span>
      <span className="mb"><span style={{ width: pct(value) }} /></span>
      <span className="mv">{pct(value)}</span>
    </div>
  )
}

function getStoredSave() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null')
    return d?.regime?.status === 'in_power' ? d : null
  } catch { return null }
}

export default function App() {
  const [speed, setSpeed] = useState(1)
  const [gameKey, setGameKey] = useState(0)
  const [seed, setSeed] = useState(1)
  const [initialSave] = useState(getStoredSave)
  const [visitRegionSel, setVisitRegionSel] = useState(REGIONS[0])
  const [infraSel, setInfraSel] = useState(REGIONS[0])
  const [foreignSel, setForeignSel] = useState(COUNTRY_IDS[0])

  const sim = useSimulation({ tickMs: 1400 / speed, seed, gameKey, initialSave })
  const { state, running } = sim
  const s = state?.stocks
  const e = state?.econ
  const inPower = state?.regime?.status === 'in_power'
  const tick = state?.time?.tick ?? 0

  const cd = (key, months) => {
    const last = state?.cooldowns?.[key] ?? -99999
    return tick - last < months * 7
  }

  function newGame() {
    try { localStorage.removeItem(SAVE_KEY) } catch (_) {}
    setSeed(Math.floor(Date.now() % 1e9)); setGameKey((k) => k + 1)
  }

  // Pause with spacebar.
  useEffect(() => {
    const onKey = (ev) => {
      if (ev.code === 'Space' && !ev.target.closest('input,button,select')) { ev.preventDefault(); if (inPower) sim.toggleRunning() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [inPower, sim])

  if (!state) return null
  const crisis = state.crisis?.pendingResponse

  return (
    <>
      <header className="topbar">
        <div className="brand">HEAD OF <span>STATE</span></div>
        <div className="date">{fmtDate(state.time)} \u00b7 Term {state.regime.term}</div>
        <div className="spacer" />
        <button className="tbtn" onClick={sim.toggleRunning} disabled={!inPower}>{running ? 'Pause' : 'Resume'}</button>
        {SPEEDS.map((sp) => <button key={sp.v} className={`tbtn ${speed === sp.v ? 'on' : ''}`} onClick={() => setSpeed(sp.v)}>{sp.l}</button>)}
        <button className="tbtn" onClick={newGame}>New term</button>
      </header>

      <main className="wrap">
        {crisis && (
          <section className="panel crisis">
            <h2>Crisis \u2014 your call <small>{crisis.type}</small></h2>
            <p>{crisis.message}</p>
            <div className="opts">
              {crisis.type === 'protest'
                ? ['dialogue', 'crackdown', 'address', 'ignore'].map((r) => <button key={r} onClick={() => sim.respondToCrisis(r)}>{r[0].toUpperCase() + r.slice(1)}</button>)
                : ['investigate', 'deny', 'ignore'].map((r) => <button key={r} onClick={() => sim.respondToCrisis(r)}>{r[0].toUpperCase() + r.slice(1)}</button>)}
            </div>
          </section>
        )}

        {/* Standing of the regime */}
        <section className="panel">
          <h2>The Regime <small>persistent</small></h2>
          <Meter id="approval" name="Public approval" value={s.approval} drivers={state.drivers.approval} />
          <Meter id="coupRisk" name="Coup risk" value={s.coupRisk} drivers={state.drivers.coup} />
          <Meter id="militaryLoyalty" name="Military loyalty" value={s.militaryLoyalty} />
          <Meter id="eliteConfidence" name="Elite confidence" value={s.eliteConfidence} />
        </section>

        {/* Society */}
        <section className="panel">
          <h2>The Street <small>persistent</small></h2>
          <Meter id="unrest" name="Civil unrest" value={s.unrest} drivers={state.drivers.unrest} />
          <Meter id="parliamentSupport" name="Parliament support" value={s.parliamentSupport} />
          <Meter id="oppositionStrength" name="Opposition strength" value={s.oppositionStrength} />
          <div style={{ marginTop: 12 }}>
            {REGIONS.map((r) => <MiniBar key={r} label={r} value={state.regions[r]} />)}
          </div>
        </section>

        {/* Economy / fiscal */}
        <section className="panel">
          <h2>The Ledger <small>monthly</small></h2>
          <div className="stats">
            <Stat label="GDP" value={money(e.gdp)} />
            <Stat label="Growth (mo)" value={`${(e.gdpGrowth * 100).toFixed(1)}%`} />
            <Stat label="Inflation" value={pct(e.inflation)} />
            <Stat label="Unemployment" value={pct(e.unemployment)} />
            <Stat label="Debt / GDP" value={pct(e.debtToGdp)} />
            <Stat label="Deficit (mo)" value={money(e.deficit)} />
          </div>
        </section>

        {/* Policy */}
        <section className="panel col-span-2">
          <h2>Policy <small>your levers</small></h2>
          <div className="presets">
            {Object.entries(PRESETS).map(([id, p]) => <button key={id} onClick={() => sim.setPolicies(p.policies)} disabled={!inPower}>{p.label}</button>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            {POLICIES.map((p) => {
              const val = state.policy[p.id]
              const disp = p.id === 'taxRate' || p.id === 'interestRate' || p.pie ? pct(val) : val.toFixed(2)
              return (
                <div className="slider" key={p.id}>
                  <div className="row"><span>{p.label}{p.pie ? ' \u00b7 budget' : ''}</span><span className="v">{disp}</span></div>
                  <input type="range" min={p.min} max={p.max} step={p.step} value={val} disabled={!inPower}
                    onChange={(ev) => sim.applyPolicy(p.id, parseFloat(ev.target.value))} />
                  <div className="aff">{p.affects}</div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Actions desk */}
        <section className="panel">
          <h2>The Desk <small>actions persist</small></h2>
          <div className="actions">
            <button className="act" onClick={sim.addressNation} disabled={!inPower || cd('address', 12)}><b>Address the nation</b><small>{cd('address', 12) ? 'On cooldown' : 'Approval boost'}</small></button>
            <button className="act" onClick={sim.pressConference} disabled={!inPower || cd('press', 6)}><b>Press conference</b><small>{cd('press', 6) ? 'On cooldown' : 'Shape the story'}</small></button>
            <button className="act" onClick={sim.cabinetMeeting} disabled={!inPower || cd('cabinet', 6)}><b>Cabinet meeting</b><small>{cd('cabinet', 6) ? 'On cooldown' : 'Elite + approval'}</small></button>
            <button className="act" onClick={sim.securityBriefing} disabled={!inPower || cd('security', 6)}><b>Security briefing</b><small>{cd('security', 6) ? 'On cooldown' : 'Lower coup risk'}</small></button>
            <button className="act" onClick={sim.tableBudget} disabled={!inPower}><b>Table budget</b><small>Parliament vote</small></button>
            <div className="act">
              <b>Visit region</b>
              <select value={visitRegionSel} onChange={(ev) => setVisitRegionSel(ev.target.value)}>{REGIONS.map((r) => <option key={r}>{r}</option>)}</select>
              <button className="tbtn" style={{ marginTop: 4 }} onClick={() => sim.visitRegion(visitRegionSel)} disabled={!inPower || cd('visit', 6)}>{cd('visit', 6) ? 'Cooldown' : 'Go'}</button>
            </div>
            <div className="act">
              <b>Launch infra</b>
              <select value={infraSel} onChange={(ev) => setInfraSel(ev.target.value)}>{REGIONS.map((r) => <option key={r}>{r}</option>)}</select>
              <button className="tbtn" style={{ marginTop: 4 }} onClick={() => sim.launchInfrastructure(infraSel)} disabled={!inPower || cd('infra', 6)}>{cd('infra', 6) ? 'Cooldown' : 'Launch'}</button>
            </div>
            <div className="act">
              <b>Meet leader</b>
              <select value={foreignSel} onChange={(ev) => setForeignSel(ev.target.value)}>{COUNTRIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <button className="tbtn" style={{ marginTop: 4 }} onClick={() => sim.meetForeignLeader(foreignSel)} disabled={!inPower || cd('foreign', 6)}>{cd('foreign', 6) ? 'Cooldown' : 'Meet'}</button>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            {COUNTRIES.map((c) => <MiniBar key={c.id} label={c.name} value={state.intl.relations[c.id]} />)}
          </div>
        </section>

        {/* Event feed */}
        <section className="panel col-span-2">
          <h2>Front Page <small>{state.events.length} entries</small></h2>
          <div className="feed">
            {[...state.events].reverse().map((ev) => (
              <div className={`ev ${ev.type}`} key={ev.id}>
                <span className="when">{MONTHS[(ev.at.month ?? 1) - 1]} {ev.at.year} \u00b7 Day {ev.at.day}</span>
                {ev.message}
              </div>
            ))}
            {state.events.length === 0 && <div className="ev">Quiet so far. Govern, and the headlines will come.</div>}
          </div>
        </section>
      </main>

      {!inPower && (
        <div className="over">
          <div className="card">
            <h1>{state.regime.status === 'coup' ? 'Overthrown' : 'Voted Out'}</h1>
            <p>{state.regime.endReason}<br />You served {state.regime.term} term{state.regime.term > 1 ? 's' : ''}. Final approval {pct(s.approval)}.</p>
            <button onClick={newGame}>Begin a new term</button>
          </div>
        </div>
      )}

      <footer>DRACO iNC \u2014 A DRACO DYNASTY Technology Department \u00b7 Head of State \u00b7 Alpha</footer>
    </>
  )
}
