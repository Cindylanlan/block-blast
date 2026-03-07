import { useEffect, useState } from 'react'

import { GamePage } from './pages/GamePage'
import { StartPage } from './pages/StartPage'
import './App.css'

const HIGH_SCORE_KEY = 'block-blast-best-score'

function App() {
  const [screen, setScreen] = useState<'start' | 'game'>('start')
  const [gameSession, setGameSession] = useState(0)
  const [bestScore, setBestScore] = useState(() => {
    const rawValue = window.localStorage.getItem(HIGH_SCORE_KEY)
    const parsedValue = Number(rawValue)

    return Number.isFinite(parsedValue) ? parsedValue : 0
  })

  useEffect(() => {
    window.localStorage.setItem(HIGH_SCORE_KEY, String(bestScore))
  }, [bestScore])

  const handleStart = () => {
    setGameSession((current) => current + 1)
    setScreen('game')
  }

  if (screen === 'game') {
    return (
      <GamePage
        key={gameSession}
        bestScore={bestScore}
        onBestScoreChange={setBestScore}
        onBackToMenu={() => setScreen('start')}
      />
    )
  }

  return <StartPage bestScore={bestScore} onStart={handleStart} />
}

export default App
