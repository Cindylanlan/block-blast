interface GameOverModalProps {
  open: boolean
  score: number
  bestScore: number
  onRestart: () => void
  onExit: () => void
}

export function GameOverModal({
  open,
  score,
  bestScore,
  onRestart,
  onExit,
}: GameOverModalProps) {
  if (!open) {
    return null
  }

  return (
    <div className="game-over">
      <div className="game-over__card">
        <p className="game-over__eyebrow">No more moves</p>
        <h2>Game Over</h2>
        <div className="game-over__scores">
          <div>
            <span>Score</span>
            <strong>{score}</strong>
          </div>
          <div>
            <span>Best</span>
            <strong>{bestScore}</strong>
          </div>
        </div>
        <div className="game-over__actions">
          <button type="button" className="primary-button" onClick={onRestart}>
            Play Again
          </button>
          <button type="button" className="secondary-button" onClick={onExit}>
            Back To Menu
          </button>
        </div>
      </div>
    </div>
  )
}
