/**
 * Debug 性能分析：通过 ?debug=1 启用，数据实时 POST 到 /__debug，在 terminal 可见
 */
const MAX_ENTRIES = 500
const POINTER_MOVE_SAMPLE = 5

export interface ProfilerEntry {
  t: number
  event: string
  duration?: number
  meta?: Record<string, unknown>
}

let sessionStart = 0
const entries: ProfilerEntry[] = []
const marks: Record<string, number> = {}
let pointerMoveCount = 0

const getT = () => (sessionStart ? Math.round(performance.now() - sessionStart) : 0)

const isEnabled = (): boolean => {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  if (params.get('debug') === '1' || params.get('perf') === '1') return true
  try {
    return localStorage.getItem('block-blast-debug') === '1'
  } catch {
    return false
  }
}

const push = (entry: ProfilerEntry) => {
  entries.push(entry)
  if (entries.length > MAX_ENTRIES) entries.shift()
}

const send = (entry: ProfilerEntry) => {
  try {
    fetch(`${window.location.origin}/__debug`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    }).catch(() => {})
  } catch {
    // ignore
  }
}

export const debugProfiler = {
  isEnabled,

  mark(name: string) {
    if (!isEnabled()) return
    marks[name] = performance.now()
  },

  measure(name: string, startMark?: string) {
    if (!isEnabled()) return
    const start = startMark ? marks[startMark] : sessionStart ? performance.now() - getT() : performance.now()
    const duration = Math.round((performance.now() - start) * 100) / 100
    const entry: ProfilerEntry = { t: getT(), event: name, duration }
    push(entry)
    send(entry)
  },

  log(event: string, meta?: Record<string, unknown>, duration?: number) {
    if (!isEnabled()) return
    const entry: ProfilerEntry = { t: getT(), event, ...(meta && { meta }), ...(duration != null && { duration }) }
    push(entry)
    send(entry)
  },

  logPointerMove(duration: number) {
    if (!isEnabled()) return
    pointerMoveCount += 1
    if (pointerMoveCount % POINTER_MOVE_SAMPLE !== 0) return
    const entry: ProfilerEntry = { t: getT(), event: 'pointerMove', duration }
    push(entry)
    send(entry)
  },

  startSession() {
    if (!isEnabled()) return
    sessionStart = performance.now()
    const entry: ProfilerEntry = { t: 0, event: 'sessionStart', meta: { userAgent: navigator.userAgent } }
    push(entry)
    send(entry)
  },

  getReport(): string {
    const summary: Record<string, number> = {}
    const moveDurations = entries.filter((e) => e.event === 'pointerMove' && e.duration != null).map((e) => e.duration!)
    const applyDurations = entries.filter((e) => e.event === 'applyGameAction' && e.duration != null).map((e) => e.duration!)
    const fxDurations = entries.filter((e) => e.event === 'gameFxEffect' && e.duration != null).map((e) => e.duration!)
    const audioDurations = entries.filter((e) => e.event === 'gameAudioEffect' && e.duration != null).map((e) => e.duration!)

    if (moveDurations.length) {
      summary.pointerMoveCount = moveDurations.length * POINTER_MOVE_SAMPLE
      summary.pointerMoveAvgMs = Math.round((moveDurations.reduce((a, b) => a + b, 0) / moveDurations.length) * 100) / 100
      summary.pointerMoveMaxMs = Math.round(Math.max(...moveDurations) * 100) / 100
    }
    if (applyDurations.length) {
      summary.applyGameActionAvgMs = Math.round((applyDurations.reduce((a, b) => a + b, 0) / applyDurations.length) * 100) / 100
      summary.applyGameActionMaxMs = Math.round(Math.max(...applyDurations) * 100) / 100
    }
    if (fxDurations.length) {
      summary.gameFxEffectAvgMs = Math.round((fxDurations.reduce((a, b) => a + b, 0) / fxDurations.length) * 100) / 100
      summary.gameFxEffectMaxMs = Math.round(Math.max(...fxDurations) * 100) / 100
    }
    if (audioDurations.length) {
      summary.gameAudioEffectAvgMs = Math.round((audioDurations.reduce((a, b) => a + b, 0) / audioDurations.length) * 100) / 100
    }

    return JSON.stringify({ sessionStart, entries, summary }, null, 2)
  },
}

if (typeof window !== 'undefined') {
  ;(window as unknown as { __DEBUG_PROFILE__?: typeof debugProfiler }).__DEBUG_PROFILE__ = debugProfiler
}
