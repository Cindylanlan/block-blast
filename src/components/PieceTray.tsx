import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'

import type { TrayPiece } from '../game/types'

interface PieceTrayProps {
  tray: TrayPiece[]
  activeSlotId: string | null
  disabled: boolean
  onPiecePointerDown: (event: ReactPointerEvent<HTMLButtonElement>, slot: TrayPiece) => void
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

export function PieceTray({
  tray,
  activeSlotId,
  disabled,
  onPiecePointerDown,
}: PieceTrayProps) {
  return (
    <section className="piece-tray">
      {tray.map((slot) => {
        const isDisabled = disabled || slot.used

        return (
          <button
            key={slot.slotId}
            type="button"
            className={[
              'tray-piece',
              slot.used ? 'tray-piece--used' : '',
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
}
