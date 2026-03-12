import type { CSSProperties } from 'react'

import type { FloatingScore } from '../types/fx'

interface ScoreBurstProps {
  floatingScores: FloatingScore[]
}

export function ScoreBurst({ floatingScores }: ScoreBurstProps) {
  return (
    <>
      {floatingScores.map((item) => (
        <div
          key={item.id}
          className="score-burst"
          style={
            {
              '--score-left': `${item.left}px`,
              '--score-top': `${item.top}px`,
              '--score-travel-x': `${item.travelX}px`,
              '--score-travel-y': `${item.travelY}px`,
            } as CSSProperties
          }
        >
          <strong>+{item.amount}</strong>
          {item.label ? <span>{item.label}</span> : null}
        </div>
      ))}
    </>
  )
}
