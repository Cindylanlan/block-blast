/**
 * 特效相关类型：Combo、飘字、粒子等
 * 供 useGameFx 和展示组件共同引用，避免组件依赖 hook 内部类型
 */
import type { PieceColor } from '../game/types'

/** Combo 展示锚点（位置） */
export interface ComboAnchor {
  left: number
  top: number
}

/** 飘字分数 */
export interface FloatingScore {
  id: number
  amount: number
  label: string | null
  left: number
  top: number
  travelX: number
  travelY: number
}

/** 碎裂粒子：每个被消除格子拆成的多块小粒子 */
export interface ClearParticle {
  id: number
  left: number
  top: number
  color: PieceColor
  size: number
  offsetX: number
  offsetY: number
  fallY: number
  delay: number
  duration: number
  opacity: number
}
