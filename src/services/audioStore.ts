/**
 * 共享音频存储：必须在用户手势（如点击 Start）中同步调用 unlock()
 * 之后 BGM 和 SFX 才能正常播放
 */
const BGM_KEY = 'block-blast-bgm-volume'
const SFX_KEY = 'block-blast-sfx-volume'

const getStoredAudioPrefs = () => {
  if (typeof localStorage === 'undefined') return { bgmVolume: 0.85, sfxVolume: 0.9 }
  const bgm = localStorage.getItem(BGM_KEY)
  const sfx = localStorage.getItem(SFX_KEY)
  return {
    bgmVolume: bgm == null ? 0.85 : Math.max(0, Math.min(1, Number.parseFloat(bgm) || 0.85)),
    sfxVolume: sfx == null ? 0.9 : Math.max(0, Math.min(1, Number.parseFloat(sfx) || 0.9)),
  }
}

type AudioContextLike = AudioContext & { resume(): Promise<void> }

let ctx: AudioContextLike | null = null
let bgmGain: GainNode | null = null
let sfxGain: GainNode | null = null
let bgmIntervalId: number | null = null
let phraseIndex = 0

const PHRASES = [
  { chord: [196.0, 246.94, 293.66] as [number, number, number], bass: 98.0, accent: 293.66 },
  { chord: [174.61, 220.0, 261.63] as [number, number, number], bass: 87.31, accent: 261.63 },
  { chord: [220.0, 261.63, 329.63] as [number, number, number], bass: 110.0, accent: 261.63 },
  { chord: [196.0, 246.94, 293.66] as [number, number, number], bass: 98.0 },
]

const playTone = (
  context: AudioContext,
  frequency: number,
  duration: number,
  volume: number,
  type: OscillatorType,
  startOffset = 0,
  dest?: AudioNode,
) => {
  const osc = context.createOscillator()
  const gain = context.createGain()
  osc.type = type
  osc.frequency.value = frequency
  osc.connect(gain)
  gain.connect(dest ?? context.destination)
  const start = context.currentTime + startOffset
  const attack = Math.min(0.06, duration * 0.22)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.start(start)
  osc.stop(start + duration)
}

const startBGM = () => {
  if (!ctx || !bgmGain || bgmIntervalId !== null) return
  const prefs = getStoredAudioPrefs()
  bgmGain.gain.value = prefs.bgmVolume

  bgmIntervalId = window.setInterval(() => {
    if (!ctx || !bgmGain) return
    const phrase = PHRASES[phraseIndex % PHRASES.length]
    phrase.chord.forEach((f, i) =>
      playTone(ctx!, f, 4.6, 0.065 - i * 0.0018, 'sine', 0, bgmGain!),
    )
    playTone(ctx!, phrase.bass, 1.4, 0.1, 'sine', 0.12, bgmGain)
    playTone(ctx!, phrase.bass * 1.5, 1.2, 0.058, 'sine', 1.4, bgmGain)
    if (phrase.accent) {
      playTone(ctx!, phrase.accent, 0.75, 0.045, 'sine', 2.2, bgmGain)
    }
    phraseIndex += 1
  }, 2400)
}

export const audioStore = {
  unlock(): boolean {
    if (ctx) {
      startBGM()
      if (ctx.state === 'suspended') ctx.resume()
      return true
    }
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return false
    ctx = new Ctor() as AudioContextLike
    const prefs = getStoredAudioPrefs()
    bgmGain = ctx.createGain()
    sfxGain = ctx.createGain()
    bgmGain.connect(ctx.destination)
    sfxGain.connect(ctx.destination)
    bgmGain.gain.value = prefs.bgmVolume
    sfxGain.gain.value = prefs.sfxVolume
    startBGM()
    ctx.resume()
    return true
  },

  getContext(): AudioContext | null {
    return ctx
  },

  getSfxDest(): GainNode | null {
    return sfxGain
  },

  stopBGM() {
    if (bgmIntervalId !== null) {
      window.clearInterval(bgmIntervalId)
      bgmIntervalId = null
    }
  },

  setBgmVolume(v: number) {
    if (bgmGain) bgmGain.gain.value = Math.max(0, Math.min(1, v))
  },

  setSfxVolume(v: number) {
    if (sfxGain) sfxGain.gain.value = Math.max(0, Math.min(1, v))
  },

  close() {
    audioStore.stopBGM()
    ctx?.close()
    ctx = null
    bgmGain = null
    sfxGain = null
  },
}
