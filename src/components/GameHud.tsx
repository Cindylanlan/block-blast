interface GameHudProps {
  score: number
  bestScore: number
  onRestart: () => void
  onBack: () => void
}

export function GameHud({ score, bestScore, onRestart, onBack }: GameHudProps) {
  return (
    <header className="game-hud">
      <button type="button" className="hud-button" onClick={onBack}>
        Menu
      </button>

      <div className="game-hud__scores">
        <div className="hud-card">
          <span className="hud-card__label">Score</span>
          <strong className="hud-card__value">{score}</strong>
        </div>
        <div className="hud-card">
          <span className="hud-card__label">Best</span>
          <strong className="hud-card__value">{bestScore}</strong>
        </div>
      </div>

      <button type="button" className="hud-button" onClick={onRestart}>
        Restart
      </button>
    </header>
  )
}
