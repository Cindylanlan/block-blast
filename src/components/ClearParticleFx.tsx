import { memo } from 'react'
import type { CSSProperties } from 'react'

import type { ClearParticle } from '../types/fx'

interface ClearParticleFxProps {
  particles: ClearParticle[]
}

/**
 * 消除碎裂粒子效果模块
 * 每个被消除的格子拆成多块小粒子，从消除中心向外散射
 * 可独立调整粒子数量、大小、散射范围、动画时长
 */
export const ClearParticleFx = memo(function ClearParticleFx({ particles }: ClearParticleFxProps) {
  if (!particles.length) {
    return null
  }

  return (
    <>
      {particles.map((p) => (
        <div
          key={p.id}
          className={`clear-particle clear-particle--${p.color}`}
          style={
            {
              '--particle-left': `${p.left}px`,
              '--particle-top': `${p.top}px`,
              '--particle-size': `${p.size}px`,
              '--particle-offset-x': `${p.offsetX}px`,
              '--particle-offset-y': `${p.offsetY}px`,
              '--particle-fall-y': `${p.fallY}px`,
              '--particle-delay': `${p.delay}ms`,
              '--particle-duration': `${p.duration}ms`,
              '--particle-opacity': p.opacity,
            } as CSSProperties
          }
        />
      ))}
    </>
  )
})
