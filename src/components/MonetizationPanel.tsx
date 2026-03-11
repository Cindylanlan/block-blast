import type { ToolType } from '../game/types'

interface MonetizationPanelProps {
  open: boolean
  pendingTool: ToolType | null
  loading: boolean
  onWatchAd: () => void
  onBuyPack: () => void
  onClose: () => void
}

const TOOL_TITLES: Record<ToolType, string> = {
  reroll: 'Reroll',
  bomb: 'Bomb',
  hammer: 'Hammer',
}

export function MonetizationPanel({
  open,
  pendingTool,
  loading,
  onWatchAd,
  onBuyPack,
  onClose,
}: MonetizationPanelProps) {
  if (!open || !pendingTool) {
    return null
  }

  return (
    <div className="monetization-panel">
      <div className="monetization-panel__card">
        <p className="game-over__eyebrow">Tool Refill</p>
        <h2>{TOOL_TITLES[pendingTool]} is empty</h2>
        <p className="monetization-panel__copy">
          This is a placeholder monetization flow. In H5 it simulates a rewarded ad or
          shop purchase, and later the same entry can connect to real SDKs.
        </p>

        <div className="monetization-panel__actions">
          <button type="button" className="primary-button" disabled={loading} onClick={onWatchAd}>
            {loading ? 'Loading...' : 'Watch Ad +1'}
          </button>
          <button type="button" className="secondary-button" disabled={loading} onClick={onBuyPack}>
            {loading ? 'Loading...' : 'Buy Pack'}
          </button>
          <button type="button" className="hud-button" disabled={loading} onClick={onClose}>
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  )
}
