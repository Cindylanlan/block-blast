interface SettingsPanelProps {
  open: boolean
  onClose: () => void
  bgmVolume: number
  onBgmVolumeChange: (volume: number) => void
  sfxVolume: number
  onSfxVolumeChange: (volume: number) => void
}

export function SettingsPanel({
  open,
  onClose,
  bgmVolume,
  onBgmVolumeChange,
  sfxVolume,
  onSfxVolumeChange,
}: SettingsPanelProps) {
  if (!open) {
    return null
  }

  return (
    <div className="settings-overlay" onClick={onClose} role="presentation">
      <section
        className="settings-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="settings-title"
      >
        <div className="settings-panel__header">
          <h2 id="settings-title">Settings</h2>
          <button type="button" className="settings-panel__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="settings-panel__body">
          <label className="settings-row">
            <span className="settings-row__label">Background</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={bgmVolume}
              onChange={(e) => onBgmVolumeChange(Number(e.target.value))}
              className="settings-slider"
            />
          </label>
          <label className="settings-row">
            <span className="settings-row__label">Effects</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={sfxVolume}
              onChange={(e) => onSfxVolumeChange(Number(e.target.value))}
              className="settings-slider"
            />
          </label>
        </div>
      </section>
    </div>
  )
}
