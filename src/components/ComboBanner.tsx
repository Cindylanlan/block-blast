import type { ComboAnchor } from '../types/fx'

interface ComboBannerProps {
  text: string | null
  /** 消除区域中心锚点，有则定位到消除区附近，无则使用默认居中 */
  anchor?: ComboAnchor | null
}

export function ComboBanner({ text, anchor }: ComboBannerProps) {
  if (!text) {
    return null
  }

  const style = anchor
    ? {
        left: `${anchor.left}px`,
        top: `${anchor.top}px`,
        transform: 'translate(-50%, -50%)',
      }
    : undefined

  return (
    <div
      className={`combo-banner ${anchor ? 'combo-banner--anchored' : ''}`}
      style={style}
      aria-live="polite"
    >
      {text}
    </div>
  )
}
