import { useCallback, useEffect, useState } from 'react'

import type { GameEvent } from '../game/types'
import { audioStore } from '../services/audioStore'
import { debugProfiler } from '../utils/debugProfiler'
import { vibrateOnClear } from '../utils/vibrate'

const BGM_VOLUME_KEY = 'block-blast-bgm-volume'
const SFX_VOLUME_KEY = 'block-blast-sfx-volume'

export function getStoredAudioPrefs(): { bgmVolume: number; sfxVolume: number } {
  if (typeof localStorage === 'undefined') {
    return { bgmVolume: 0.85, sfxVolume: 0.9 }
  }
  const bgm = localStorage.getItem(BGM_VOLUME_KEY)
  const sfx = localStorage.getItem(SFX_VOLUME_KEY)
  return {
    bgmVolume: bgm == null ? 0.85 : Math.max(0, Math.min(1, Number.parseFloat(bgm) || 0.85)),
    sfxVolume: sfx == null ? 0.9 : Math.max(0, Math.min(1, Number.parseFloat(sfx) || 0.9)),
  }
}

interface UseGameAudioResult {
  unlockAudio: () => void
  audioReady: boolean
  bgmVolume: number
  setBgmVolume: (volume: number) => void
  sfxVolume: number
  setSfxVolume: (volume: number) => void
  playDragWhoosh: () => void
}

type AudioDest = AudioNode

const playTone = (
  context: AudioContext,
  frequency: number,
  duration: number,
  volume: number,
  type: OscillatorType,
  startOffset = 0,
  dest?: AudioDest,
) => {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = type
  oscillator.frequency.value = frequency
  oscillator.connect(gain)
  gain.connect(dest ?? context.destination)
  const start = context.currentTime + startOffset
  const attack = Math.min(0.06, duration * 0.22)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.start(start)
  oscillator.stop(start + duration)
}

const playGlideTone = (
  context: AudioContext,
  fromFrequency: number,
  toFrequency: number,
  duration: number,
  volume: number,
  type: OscillatorType,
  startOffset = 0,
  dest?: AudioDest,
) => {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = type
  const start = context.currentTime + startOffset
  oscillator.frequency.setValueAtTime(fromFrequency, start)
  oscillator.frequency.exponentialRampToValueAtTime(toFrequency, start + duration)
  oscillator.connect(gain)
  gain.connect(dest ?? context.destination)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + duration * 0.24)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.start(start)
  oscillator.stop(start + duration)
}

const playPlacementTone = (context: AudioContext, dest?: AudioDest) => {
  playTone(context, 220, 0.08, 0.055, 'triangle', 0, dest)
  playTone(context, 329.63, 0.11, 0.038, 'sine', 0.025, dest)
}

const playDragWhooshImpl = (context: AudioContext, dest?: AudioDest) => {
  playGlideTone(context, 400, 180, 0.12, 0.032, 'sine', 0, dest)
  playTone(context, 220, 0.08, 0.022, 'triangle', 0.04, dest)
}

const playClearChime = (context: AudioContext, lineCount: number, dest?: AudioDest) => {
  const padRoot = lineCount > 1 ? 261.63 : 246.94
  const sparkle = lineCount > 1 ? [392.0, 523.25, 659.25] : [369.99, 493.88, 587.33]
  playTone(context, padRoot, 0.28, 0.07, 'sine', 0, dest)
  playTone(context, padRoot * 2, 0.24, 0.055, 'triangle', 0.04, dest)
  sparkle.forEach((note, index) => {
    playTone(context, note, 0.16 + index * 0.04, 0.055 - index * 0.006, 'triangle', 0.07 * index, dest)
  })
}

const playAffirmation = (context: AudioContext, variant: 'good' | 'great' | 'wow', dest?: AudioDest) => {
  if (variant === 'wow') {
    playGlideTone(context, 740, 988, 0.18, 0.065, 'sine', 0.2, dest)
    playGlideTone(context, 988, 830, 0.16, 0.05, 'triangle', 0.38, dest)
    playTone(context, 1174.66, 0.14, 0.04, 'sine', 0.48, dest)
    return
  }
  if (variant === 'great') {
    playGlideTone(context, 523.25, 783.99, 0.16, 0.058, 'sine', 0.15, dest)
    playTone(context, 987.77, 0.14, 0.048, 'triangle', 0.32, dest)
    playTone(context, 1046.5, 0.1, 0.035, 'sine', 0.44, dest)
    return
  }
  playGlideTone(context, 659.25, 830.61, 0.14, 0.052, 'sine', 0.18, dest)
  playTone(context, 987.77, 0.12, 0.042, 'triangle', 0.34, dest)
}

const playCallout = (context: AudioContext, tier: 'good' | 'great' | 'wow', dest?: AudioDest) => {
  playAffirmation(context, tier, dest)
}

const playRewardTone = (context: AudioContext, dest?: AudioDest) => {
  playTone(context, 523.25, 0.14, 0.028, 'triangle', 0, dest)
  playTone(context, 659.25, 0.18, 0.025, 'triangle', 0.06, dest)
  playTone(context, 783.99, 0.26, 0.022, 'sine', 0.12, dest)
}

const playGameOverTone = (context: AudioContext, dest?: AudioDest) => {
  playTone(context, 220, 0.18, 0.025, 'sine', 0, dest)
  playTone(context, 196, 0.24, 0.022, 'triangle', 0.08, dest)
  playTone(context, 164.81, 0.32, 0.02, 'triangle', 0.18, dest)
}

export const useGameAudio = (eventSequence: number, recentEvents: GameEvent[]): UseGameAudioResult => {
  const prefs = getStoredAudioPrefs()
  const [bgmVolume, setBgmVolumeState] = useState(prefs.bgmVolume)
  const [sfxVolume, setSfxVolumeState] = useState(prefs.sfxVolume)

  const setBgmVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v))
    setBgmVolumeState(clamped)
    audioStore.setBgmVolume(clamped)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(BGM_VOLUME_KEY, String(clamped))
    }
  }, [])

  const setSfxVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v))
    setSfxVolumeState(clamped)
    audioStore.setSfxVolume(clamped)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SFX_VOLUME_KEY, String(clamped))
    }
  }, [])

  const unlockAudio = useCallback(() => {
    audioStore.unlock()
  }, [])

  useEffect(() => {
    if (!recentEvents.length) return
    const context = audioStore.getContext()
    const dest = audioStore.getSfxDest()
    if (!context || !dest) return

    const t0 = debugProfiler.isEnabled() ? performance.now() : 0
    for (const event of recentEvents) {
      switch (event.type) {
        case 'piecePlaced':
          playPlacementTone(context, dest)
          break
        case 'linesCleared':
          playClearChime(context, event.lineCount, dest)
          vibrateOnClear(event.lineCount)
          break
        case 'comboAdvanced': {
          const tier =
            event.comboStreak >= 4 || event.clearedLineCount > 2
              ? 'wow'
              : event.comboStreak >= 3
                ? 'great'
                : 'good'
          playCallout(context, tier, dest)
          break
        }
        case 'toolUsed':
          playTone(context, event.tool === 'hammer' ? 196 : 155.56, 0.12, 0.022, 'triangle', 0, dest)
          break
        case 'rewardGranted':
        case 'revived':
          playRewardTone(context, dest)
          break
        case 'gameOver':
          playGameOverTone(context, dest)
          break
        default:
          break
      }
    }
    if (debugProfiler.isEnabled()) {
      debugProfiler.log('gameAudioEffect', undefined, Math.round((performance.now() - t0) * 100) / 100)
    }
  }, [eventSequence, recentEvents])

  const playDragWhoosh = useCallback(() => {
    const context = audioStore.getContext()
    const dest = audioStore.getSfxDest()
    if (context && dest) {
      playDragWhooshImpl(context, dest)
    }
  }, [])

  return {
    unlockAudio,
    audioReady: !!audioStore.getContext(),
    bgmVolume,
    setBgmVolume,
    sfxVolume,
    setSfxVolume,
    playDragWhoosh,
  }
}
