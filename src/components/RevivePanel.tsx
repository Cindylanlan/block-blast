interface RevivePanelProps {
  open: boolean
  loading: boolean
  onWatchAd: () => void
  onBuyRevive: () => void
  onClose: () => void
}

export function RevivePanel({
  open,
  loading,
  onWatchAd,
  onBuyRevive,
  onClose,
}: RevivePanelProps) {
  if (!open) {
    return null
  }

  return (
    <div className="monetization-panel">
      <div className="monetization-panel__card">
        <p className="game-over__eyebrow">复活选项</p>
        <h2>继续这一局</h2>
        <p className="monetization-panel__copy">
          选择看广告复活，或者直接购买复活机会。
        </p>

        <div className="monetization-panel__actions">
          <button type="button" className="primary-button" disabled={loading} onClick={onWatchAd}>
            {loading ? '处理中...' : '看广告复活'}
          </button>
          <button type="button" className="secondary-button" disabled={loading} onClick={onBuyRevive}>
            {loading ? '处理中...' : '购买复活'}
          </button>
          <button type="button" className="hud-button" disabled={loading} onClick={onClose}>
            返回
          </button>
        </div>
      </div>
    </div>
  )
}
