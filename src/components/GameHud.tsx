import type { RefObject } from 'react'

interface GameHudProps {
  score: number
  bestScore: number
  comboStreak: number
  scoreCardRef: RefObject<HTMLDivElement | null>
  onRestart: () => void
  onBack: () => void
  onSettings?: () => void
  onShare?: () => void
  scoresInHeader?: boolean
}

const ThreeDotsIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <circle cx="6" cy="12" r="1.5" fill="currentColor" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    <circle cx="18" cy="12" r="1.5" fill="currentColor" />
  </svg>
)

const WeChatExitIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="4" fill="currentColor" />
  </svg>
)

export function GameHud({
  score,
  bestScore,
  comboStreak,
  scoreCardRef,
  onRestart,
  onBack,
  onSettings,
  onShare,
  scoresInHeader = true,
}: GameHudProps) {
  return (
    <header className={['game-hud', !scoresInHeader ? 'game-hud--compact' : ''].filter(Boolean).join(' ')}>
      <div className="game-hud__left">
        <button type="button" className="hud-button" onClick={onBack}>
          Menu
        </button>
        <button type="button" className="hud-button" onClick={onRestart}>
          Restart
        </button>
        {onSettings ? (
          <button type="button" className="hud-button hud-button--icon" onClick={onSettings} aria-label="Settings">
            ⚙
          </button>
        ) : null}
      </div>

      {scoresInHeader ? (
        <div className="game-hud__scores">
          <div className={['hud-card', comboStreak > 1 ? 'hud-card--charged' : ''].filter(Boolean).join(' ')} ref={scoreCardRef}>
            <span className="hud-card__label">Score</span>
            <strong className="hud-card__value">{score}</strong>
            {comboStreak > 1 ? <em className="hud-card__combo">x{comboStreak}</em> : null}
          </div>
          <div className="hud-card">
            <span className="hud-card__label">Best</span>
            <strong className="hud-card__value">{bestScore}</strong>
          </div>
        </div>
      ) : null}

      <div className="game-hud__right">
        <button
          type="button"
          className="hud-button hud-button--icon"
          onClick={onShare ?? (() => {})}
          aria-label="更多"
        >
          <ThreeDotsIcon />
        </button>
        <button
          type="button"
          className="hud-button hud-button--icon"
          onClick={onBack}
          aria-label="退出"
        >
          <WeChatExitIcon />
        </button>
      </div>
    </header>
  )
}
