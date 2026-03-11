import { memo } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'

import type { TrayPiece } from '../game/types'

interface PieceTrayProps {
  tray: TrayPiece[]
  activeSlotId: string | null
  blockedSlotIds: Set<string>
  warningSlotIds: Set<string>
  disabled: boolean
  onPiecePointerDown: (event: ReactPointerEvent<HTMLButtonElement>, slot: TrayPiece) => void
  boardCellSize?: number
  boardGap?: number
  trayCellSize?: number
}

const renderPieceMatrix = (slot: TrayPiece) => {
  const cells = new Set(slot.piece.cells.map((cell) => `${cell.row}-${cell.col}`))
  const rows = Array.from({ length: slot.piece.height }, (_, row) => row)
  const cols = Array.from({ length: slot.piece.width }, (_, col) => col)

  return rows.flatMap((row) =>
    cols.map((col) => {
      const isFilled = cells.has(`${row}-${col}`)

      return (
        <div
          key={`${slot.slotId}-${row}-${col}`}
          className={[
            'tray-piece__cell',
            isFilled ? `tray-piece__cell--${slot.piece.color}` : 'tray-piece__cell--empty',
          ].join(' ')}
        />
      )
    }),
  )
}

export const PieceTray = memo(function PieceTray({
  tray,
  activeSlotId,
  blockedSlotIds,
  warningSlotIds,
  disabled,
  onPiecePointerDown,
  boardCellSize,
  boardGap,
  trayCellSize,
}: PieceTrayProps) {
  const effectiveCellSize = trayCellSize ?? boardCellSize ?? 24
  const effectiveGap = boardGap ?? 6
  const isBoardSized = (boardCellSize != null || trayCellSize != null)
  const trayStyle = isBoardSized
    ? ({
        '--tray-cell-size': `${effectiveCellSize}px`,
        '--tray-gap': `${effectiveGap}px`,
      } as CSSProperties)
    : undefined

  return (
    <section
      className={['piece-tray', isBoardSized ? 'piece-tray--board-sized' : ''].filter(Boolean).join(' ')}
      style={trayStyle}
    >
      {tray.map((slot) => {
        const blocked = blockedSlotIds.has(slot.slotId)
        const warning = !blocked && warningSlotIds.has(slot.slotId)
        const isDisabled = disabled || slot.used || blocked

        return (
          <button
            key={slot.slotId}
            type="button"
            className={[
              'tray-piece',
              slot.used ? 'tray-piece--used' : '',
              blocked ? 'tray-piece--blocked' : '',
              warning ? 'tray-piece--warning' : '',
              activeSlotId === slot.slotId ? 'tray-piece--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            disabled={isDisabled}
            onPointerDown={(event) => onPiecePointerDown(event, slot)}
          >
            <div
              className="tray-piece__shape"
              style={
                {
                  '--piece-cols': slot.piece.width,
                  '--piece-rows': slot.piece.height,
                } as CSSProperties
              }
            >
              {renderPieceMatrix(slot)}
            </div>
        </button>
      )
    })}
  </section>
)
})
