[README.md](https://github.com/user-attachments/files/28990873/README.md)
# Head of State

**A deep political simulation.**
DRACO iNC — A DRACO DYNASTY Technology Department · Nairobi, Kenya

You run a nation. Every speech, budget, crisis call, and policy lever moves a living
web of approval, loyalty, treasury, and power — and the consequences *stick* and
compound over years. Survive elections, keep the military loyal, avoid the coup.

This is the ground-up rebuild of the earlier Presidential-Sim — same fantasy, an
entirely new and far deeper engine, built to stay stable and grow into a full 3D world.

---

## What this build is (Phase 1 — verified)

The complete simulation **brain** plus a full playable **dashboard**. No 3D yet — that
is Phase 2, and it gets built on top of this exact, proven engine.

What already works:

- **Actions that matter.** Approval, coup risk, and military loyalty are persistent —
  a national address lifts your standing and the lift *survives and decays naturally*
  instead of being wiped a second later. (This was the core flaw in the old build.)
- **A real economy.** Tax, spending across six budget lines, money-printing, interest
  rates and corruption all feed GDP growth, inflation, unemployment, deficit and debt.
- **Real power dynamics.** Military loyalty, elite confidence, parliament and opposition
  strength shift with how you govern. Push too hard, too authoritarian, too broke —
  the generals move.
- **Events & elections.** Protests you must respond to, scandals, debt crises,
  diplomacy, and elections every four years that you can actually lose.
- **Full transparency.** Every meter shows the *drivers* underneath it — you can see
  exactly what is pulling each number up or down.

It is verified by a headless test harness (`npm test`) that proves the engine is
stable, that actions persist, that the economy responds, that misrule can topple you,
and that the simulation is deterministic (same seed → same run).

---



## How it's built (plain version)

- **The engine** lives in `src/sim/` — pure logic, no graphics. It is just numbers and
  rules, which is why it can be tested on its own and trusted.
- **The dashboard** lives in `src/App.jsx` and `src/ui/` — it reads the engine and
  draws the panels, sliders, and action buttons.
- **They are kept separate on purpose.** The graphics layer (Phase 2's 3D world) will
  sit on top of the same engine without touching it. That separation is what keeps the
  whole thing from breaking the way the old one did.

Full technical detail: see `docs/00-ARCHITECTURE.md`.

---

## What's next

| Phase | What it adds | Status |
|---|---|---|
| 1 | Deep engine + full dashboard | ✓ Built & verified |
| 2 | react-three-fiber 3D world — office, palace, chamber, motorcade | Next |
| 3 | Immersion — state visits, regional travel, briefings as 3D flows | Planned |
| 4 | Balance, polish, GitHub Pages deploy | Planned |

---

*DRACO iNC — A DRACO DYNASTY Technology Department*
*Built with Claude. Free-first. Browser-based. Built to last.*
