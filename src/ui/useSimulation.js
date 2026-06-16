import { useEffect, useMemo, useRef, useState } from 'react'
import { createEngine } from '../sim/engine.js'

export const SAVE_KEY = 'draco-presidential-sim-save'
const SAVE_EVERY = 7 // save once per in-game month

/** Drives the engine on a timer and exposes state + actions to React. */
export function useSimulation({ tickMs = 1400, seed = 1, gameKey = 0, initialSave = null } = {}) {
  const engineRef = useRef(null)
  const [state, setState] = useState(null)
  const [running, setRunning] = useState(true)
  const runningRef = useRef(true)

  const api = useMemo(() => {
    const wrap = (fn) => (...args) => {
      const eng = engineRef.current
      if (!eng) return
      eng[fn](...args)
      const next = eng.getState()
      setState(next)
      if (next.regime.status === 'in_power') {
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(next)) } catch (_) {}
      }
    }
    return {
      applyPolicy: wrap('applyPolicy'),
      setPolicies: wrap('setPolicies'),
      addressNation: wrap('addressNation'),
      pressConference: wrap('pressConference'),
      cabinetMeeting: wrap('cabinetMeeting'),
      securityBriefing: wrap('securityBriefing'),
      visitRegion: wrap('visitRegion'),
      launchInfrastructure: wrap('launchInfrastructure'),
      meetForeignLeader: wrap('meetForeignLeader'),
      tableBudget: wrap('tableBudget'),
      respondToCrisis: wrap('respondToCrisis'),
      toggleRunning() { setRunning((v) => { runningRef.current = !v; return !v }) },
    }
  }, [])

  useEffect(() => {
    const useSave = gameKey === 0 && initialSave?.regime?.status === 'in_power'
    const engine = createEngine({ seed, initialState: useSave ? initialSave : undefined })
    engineRef.current = engine
    setState(engine.getState())
    runningRef.current = true
    setRunning(true)

    const id = setInterval(() => {
      if (!runningRef.current) return
      engine.tick()
      const next = engine.getState()
      setState(next)
      if (next.regime.status === 'in_power' && next.time.tick % SAVE_EVERY === 0) {
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(next)) } catch (_) {}
      }
    }, tickMs)
    return () => clearInterval(id)
  }, [tickMs, seed, gameKey, initialSave])

  // Auto-pause when the regime falls.
  useEffect(() => {
    if (state?.regime?.status && state.regime.status !== 'in_power') {
      runningRef.current = false
      setRunning(false)
    }
  }, [state?.regime?.status])

  return { state, running, ...api }
}
