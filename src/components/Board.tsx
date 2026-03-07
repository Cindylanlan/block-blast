import type { RefObject } from 'react'

import type { BoardMatrix, PlacementPreview } from '../game/types'

interface BoardProps {
  board: BoardMatrix
  preview: PlacementPreview | null
  clearedRows: number[]
  clearedCols: number[]
  boardRef: RefObject<HTMLDivElement | null>
}

const previewContainsCell = (preview: PlacementPreview | null, row: number, col: number) =>
  preview?.cells.some((cell) => cell.row === row && cell.col === col) ?? false

const isFlashingCell = (row: number, col: number, clearedRows: number[], clearedCols: number[]) =>
  clearedRows.includes(row) || clearedCols.includes(col)

export function Board({
  board,
  preview,
  clearedRows,
  clearedCols,
  boardRef,
}: BoardProps) {
  return (
    <div className="board-shell">
      <div className="board" ref={boardRef}>
        {board.map((boardRow, rowIndex) =>
          boardRow.map((cell, colIndex) => {
            const hasPreview = previewContainsCell(preview, rowIndex, colIndex)
            const flashing = isFlashingCell(rowIndex, colIndex, clearedRows, clearedCols)

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={[
                  'board__cell',
                  cell ? `board__cell--${cell}` : '',
                  hasPreview
                    ? preview?.valid
                      ? 'board__cell--preview-valid'
                      : 'board__cell--preview-invalid'
                    : '',
                  flashing ? 'board__cell--flash' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
            )
          }),
        )}
      </div>
    </div>
  )
}
