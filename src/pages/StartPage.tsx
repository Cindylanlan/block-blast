interface StartPageProps {
  bestScore: number
  onStart: () => void
}

export function StartPage({ bestScore, onStart }: StartPageProps) {
  return (
    <main className="start-page">
      <section className="start-card">
        <p className="start-card__eyebrow">Puzzle Challenge</p>
        <h1>Block Blast</h1>
        <p className="start-card__copy">
          Place all three blocks, clear rows and columns, and keep the board alive as
          long as possible.
        </p>

        <div className="start-card__stats">
          <span>Best Score</span>
          <strong>{bestScore}</strong>
        </div>

        <button type="button" className="primary-button primary-button--large" onClick={onStart}>
          Start Game
        </button>
      </section>
    </main>
  )
}
