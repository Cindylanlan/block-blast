import type { CSSProperties } from 'react'

interface GameOverModalProps {
  open: boolean
  score: number
  bestScore: number
  onRestart: () => void
  onExit: () => void
}

const FIREWORKS = [
  { left: '16%', top: '18%', delay: '0ms' },
  { left: '78%', top: '20%', delay: '180ms' },
  { left: '24%', top: '68%', delay: '320ms' },
  { left: '82%', top: '62%', delay: '120ms' },
]

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
      <div className="fireworks" aria-hidden="true">
        {FIREWORKS.map((firework, index) => (
          <div
            key={`${firework.left}-${firework.top}`}
            className="firework"
            style={
              {
                '--firework-left': firework.left,
                '--firework-top': firework.top,
                '--firework-delay': firework.delay,
              } as CSSProperties
            }
          >
            {Array.from({ length: 8 }, (_, particleIndex) => (
              <span
                key={`${index}-${particleIndex}`}
                className="firework__particle"
                style={{ '--firework-angle': `${particleIndex * 45}deg` } as CSSProperties}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="game-over__card">
        <p className="game-over__eyebrow">游戏结束</p>
        <h2>本局结束</h2>
        <div className="game-over__scores">
          <div>
            <span>当前分数</span>
            <strong>{score}</strong>
          </div>
          <div>
            <span>最高分数</span>
            <strong>{bestScore}</strong>
          </div>
        </div>
        <div className="game-over__actions">
          <button type="button" className="primary-button" onClick={onRestart}>
            再来一次
          </button>
          <button type="button" className="hud-button" onClick={onExit}>
            返回菜单
          </button>
        </div>
      </div>
    </div>
  )
}
