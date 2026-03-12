import { useEffect, useState } from 'react'

import { CONFIG } from '../game/config'

type GameOverPhase = 'none' | 'banner' | 'countdown' | 'summary'

interface UseGameOverFlowArgs {
  gameOver: boolean
  onReviveAd: () => Promise<void>
  onReviveShop: () => Promise<void>
}

export function useGameOverFlow({
  gameOver,
  onReviveAd,
  onReviveShop,
}: UseGameOverFlowArgs) {
  const [gameOverPhase, setGameOverPhase] = useState<GameOverPhase>('none')
  const [failBannerCountdown, setFailBannerCountdown] = useState<number>(
    CONFIG.failBannerCountdownInitial,
  )
  const [failBannerRemainingRatio, setFailBannerRemainingRatio] = useState(1)
  const [showReviveOptions, setShowReviveOptions] = useState(false)
  const [reviveLoading, setReviveLoading] = useState(false)

  useEffect(() => {
    if (!gameOver) {
      setFailBannerCountdown(CONFIG.failBannerCountdownInitial)
      setFailBannerRemainingRatio(1)
      setGameOverPhase('none')
      setReviveLoading(false)
      setShowReviveOptions(false)
      return undefined
    }
    setFailBannerCountdown(CONFIG.failBannerCountdownInitial)
    setFailBannerRemainingRatio(1)
    setGameOverPhase('banner')
    setShowReviveOptions(false)
    return undefined
  }, [gameOver])

  useEffect(() => {
    if (!gameOver || gameOverPhase !== 'banner') return undefined
    const t = window.setTimeout(() => setGameOverPhase('countdown'), CONFIG.failBannerBannerDelayMs)
    return () => window.clearTimeout(t)
  }, [gameOver, gameOverPhase])

  useEffect(() => {
    if (!gameOver || gameOverPhase !== 'countdown') {
      setFailBannerCountdown(CONFIG.failBannerCountdownInitial)
      setFailBannerRemainingRatio(1)
      return undefined
    }
    if (reviveLoading || showReviveOptions) return undefined

    const startedAt = window.performance.now()
    const durationMs = CONFIG.failBannerDurationMs
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, durationMs - (window.performance.now() - startedAt))
      setFailBannerCountdown(Math.max(0, Math.ceil(remaining / 1000)))
      setFailBannerRemainingRatio(remaining / durationMs)
      if (remaining <= 0) {
        window.clearInterval(timer)
        setGameOverPhase('summary')
      }
    }, 80)
    return () => window.clearInterval(timer)
  }, [gameOver, gameOverPhase, reviveLoading, showReviveOptions])

  const openSummary = () => {
    setShowReviveOptions(false)
    setGameOverPhase('summary')
  }

  const handleRevive = async (mode: 'ad' | 'shop') => {
    if (reviveLoading) return
    setReviveLoading(true)
    try {
      if (mode === 'ad') await onReviveAd()
      else await onReviveShop()
      setFailBannerCountdown(CONFIG.failBannerCountdownInitial)
      setFailBannerRemainingRatio(1)
      setGameOverPhase('none')
      setShowReviveOptions(false)
    } finally {
      setReviveLoading(false)
    }
  }

  const resetForRestart = () => {
    setFailBannerCountdown(CONFIG.failBannerCountdownInitial)
    setFailBannerRemainingRatio(1)
    setGameOverPhase('none')
    setShowReviveOptions(false)
    setReviveLoading(false)
  }

  return {
    gameOverPhase,
    failBannerCountdown,
    failBannerRemainingRatio,
    showReviveOptions,
    setShowReviveOptions,
    reviveLoading,
    openSummary,
    handleRevive,
    resetForRestart,
  }
}
