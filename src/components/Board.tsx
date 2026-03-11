import { memo } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode, RefObject } from 'react'
import type { BoardMatrix, CellOffset, PlacementPreview } from '../game/types'

interface BoardProps {
  board: BoardMatrix
  preview: PlacementPreview | null
  clearedRows: number[]
  clearedCols: number[]
  highlightedCells?: CellOffset[]
  failBanner?: ReactNode
  boardRef: RefObject<HTMLDivElement | null>
  onBoardPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void
  onBoardPointerMove?: (event: ReactPointerEvent<HTMLDivElement>) => void
}

const previewContainsCell = (preview: PlacementPreview | null, row: number, col: number) =>
  preview?.cells.some((cell) => cell.row === row && cell.col === col) ?? false

const isFlashingCell = (row: number, col: number, clearedRows: number[], clearedCols: number[]) =>
  clearedRows.includes(row) || clearedCols.includes(col)

const isClearHintCell = (preview: PlacementPreview | null, row: number, col: number) =>
  preview?.valid ? preview.wouldClearRows.includes(row) || preview.wouldClearCols.includes(col) : false

const includesCell = (cells: CellOffset[] | undefined, row: number, col: number) =>
  cells?.some((cell) => cell.row === row && cell.col === col) ?? false

export const Board = memo(function Board({
  board,
  preview,
  clearedRows,
  clearedCols,
  highlightedCells,
  failBanner,
  boardRef,
  onBoardPointerDown,
  onBoardPointerMove,
}: BoardProps) {
  return (
    <div className="board-shell">
      {failBanner ? <div className="board-shell__overlay">{failBanner}</div> : null}
      <div
        className="board"
        ref={boardRef}
        onPointerDown={onBoardPointerDown}
        onPointerMove={onBoardPointerMove}
      >
        {board.map((boardRow, rowIndex) =>
          boardRow.map((cell, colIndex) => {
            const hasPreview = previewContainsCell(preview, rowIndex, colIndex)
            const flashing = isFlashingCell(rowIndex, colIndex, clearedRows, clearedCols)
            const clearHint = isClearHintCell(preview, rowIndex, colIndex)
            const highlighted = includesCell(highlightedCells, rowIndex, colIndex)

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
                  clearHint ? 'board__cell--clear-hint' : '',
                  highlighted ? 'board__cell--targeted' : '',
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
})
