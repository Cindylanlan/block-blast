/**
 * Combo 人声：女声、自然、年轻、激昂
 * 需在用户手势中调用 warmUp() 以解锁移动端
 */
const FEMALE_KEYWORDS = [
  'female',
  'samantha',
  'karen',
  'victoria',
  'alice',
  'emily',
  'susan',
  'sarah',
  'linda',
  'laura',
  'jennifer',
  'google uk english female',
  'google us english female',
  'microsoft zira',
  'tingting',
  'sin-ji',
]

let cachedFemaleVoice: SpeechSynthesisVoice | null = null
let warmedUp = false

const loadVoices = (): SpeechSynthesisVoice[] => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return []
  return window.speechSynthesis.getVoices()
}

const pickFemaleVoice = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
  const enVoices = voices.filter((v) => v.lang.startsWith('en'))
  const lower = (s: string) => s.toLowerCase()
  const female = enVoices.find((v) =>
    FEMALE_KEYWORDS.some((kw) => lower(v.name).includes(kw)),
  )
  if (female) return female
  const defaultEn = enVoices.find((v) => v.default) ?? enVoices[0]
  return defaultEn ?? voices[0] ?? null
}

const ensureVoices = () => {
  if (cachedFemaleVoice) return cachedFemaleVoice
  const voices = loadVoices()
  if (voices.length > 0) {
    cachedFemaleVoice = pickFemaleVoice(voices)
    return cachedFemaleVoice
  }
  return null
}

export function initSpeechCombo(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  ensureVoices()
  window.speechSynthesis.onvoiceschanged = () => {
    cachedFemaleVoice = null
    ensureVoices()
  }
}

export function warmUpSpeech(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis || warmedUp) return
  try {
    const u = new SpeechSynthesisUtterance('\u00A0')
    u.volume = 0.01
    u.rate = 0.1
    window.speechSynthesis.speak(u)
    warmedUp = true
  } catch {
    warmedUp = true
  }
}

export function speakCombo(word: 'good' | 'great' | 'wow'): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  try {
    window.speechSynthesis.cancel()
    let voice = ensureVoices()
    if (!voice && loadVoices().length > 0) {
      cachedFemaleVoice = pickFemaleVoice(loadVoices())
      voice = cachedFemaleVoice
    }
    const u = new SpeechSynthesisUtterance(word)
    u.lang = 'en-US'
    u.rate = 0.88
    u.pitch = 1.08
    u.volume = 1
    if (voice) u.voice = voice
    window.speechSynthesis.speak(u)
  } catch {
    // 移动端可能静默失败
  }
}
