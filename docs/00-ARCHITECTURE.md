# 00 — Architecture

**Head of State** · DRACO iNC — A DRACO DYNASTY Technology Department
Rebuild of Presidential-Sim · June 2026

This document records *why* the rebuild is shaped the way it is. The old build was not
rebuilt for being ugly — it was rebuilt because its structure produced two permanent
problems: it felt **basic** (your actions didn't matter) and it went **buggy** (the 3D
view kept blanking out). Both were structural. This architecture removes the cause of
each, not the symptom.

---

## The three decisions that define the rebuild

### 1. Approval, coup risk and loyalty are persistent *stocks*

**The old problem.** Every in-game day, the old engine recalculated national approval
and coup risk *from scratch* off the current policy settings, then hard-assigned them.
A speech that added +3% approval was overwritten within about two seconds. So no matter
how many systems existed, the player's *actions* evaporated — the game felt shallow.

**The fix.** Approval, coup risk, military loyalty, elite confidence and the rest are
now **stocks** — values that have memory. Each day the engine computes a *target* from
the fundamentals (economy, ideology, repression, fairness) and then **eases the stock
toward that target** a little, instead of snapping to it. Actions add a real bump to the
stock; the bump persists and then decays naturally back toward the fundamentals.

The single primitive that makes this work is `approach(current, target, rate)` in
`src/sim/math.js`. It is the most important function in the codebase.

> Proven in `npm test`, TEST 2: a speech moves approval 0.60 → 0.65, it is still 0.65
> on the next tick, and it decays back to 0.60 over ~30 days.

### 2. react-three-fiber for the 3D world (Phase 2)

**The old problem.** The 3D view was ~1,400 lines of hand-written Three.js that moved
the camera and toggled object visibility manually, frame by frame, tracked with refs.
Returning from an activity often left the screen black or stuck. An entire
`FRAGILE-AREAS.md` and a `.cursor/rules` file existed just to manage this one hazard.

**The fix.** Phase 2 uses **react-three-fiber** (already the DRACO-approved 3D stack,
shared with Hall of Dynasties). The scene is *declared* from state — you describe what
the world should look like for the current situation and it renders it. There is no
manual camera bookkeeping to fall out of sync, so the entire "blank view on return"
class of bug cannot occur.

### 3. One activity state machine, not twenty flags

**The old problem.** "What is the player doing right now" was tracked by ~20 separate
on/off `useState` flags spread across App and the 3D view. When they disagreed —
which they eventually did — a flow got stuck.

**The fix.** A single `activity` value with defined, legal transitions. One place knows
every valid next step, so a flow physically cannot get stuck or half-entered.

---

## Layout

```
src/
  sim/                 the engine — pure logic, no React, fully testable
    math.js            clamp, approach (the persistence primitive), round
    rng.js             seeded random — deterministic runs
    constants.js       every tunable number: policies, presets, regions, rates
    state.js           the initial nation
    economy.js         monthly fiscal model — GDP, inflation, debt, unemployment
    society.js         approval & unrest targets from how you govern
    power.js           military loyalty, elite confidence, coup-risk targets
    events.js          coups, elections, protests, scandals, diplomacy
    engine.js          orchestrator: ties it together, exposes actions
  ui/
    useSimulation.js   React hook — runs the engine on a clock, saves to browser
  App.jsx              the dashboard
  index.css            DRACO visual identity
tools/
  harness.mjs          headless test harness — proves the engine (npm test)
docs/
  00-ARCHITECTURE.md   this file
```

**The rule that holds it together:** `src/sim/` never imports from `src/ui/` or React.
The engine knows nothing about how it is drawn. That is what lets the 3D world be added
in Phase 2 without destabilising anything that already works.

---

## Tick model

- The clock advances in **days**. `DAYS_PER_MONTH = 7` (a game-feel month, not a
  calendar month) keeps a term paced for play.
- **Economy updates monthly** (on day 1), because fiscal figures move on a monthly
  cadence — applying monthly rates every day was an early bug that made debt explode.
- Each tick: advance time → (month start) update economy → compute society & power
  targets → **ease every stock toward its target** → drift regions & relations →
  calendar checks → roll events.

---

## Verification

The engine is validated headlessly before any UI is trusted:

```bash
npm test
```

Five checks: stability over 6 years, action persistence, fiscal response, regime
collapse under misrule, and determinism. All must pass before a build is delivered.

---

*This is a living document. It updates as Head of State grows.*
