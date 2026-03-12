import { canPlacePiece, getAbsoluteCells, getPlacementClearLines } from './board'
import { CONFIG } from './config'
import type { BoardMatrix, PieceDefinition, PlacementPreview } from './types'

interface CandidatePlacement {
  row: number
  col: number
  distance: number
}

const pushCandidate = (
  candidates: CandidatePlacement[],
  row: number,
  col: number,
  floatRow: number,
  floatCol: number,
) => {
  candidates.push({
    row,
    col,
    distance: Math.hypot(row - floatRow, col - floatCol),
  })
}

export const findPlacementPreview = (
  board: BoardMatrix,
  piece: PieceDefinition,
  floatRow: number,
  floatCol: number,
): PlacementPreview => {
  const roundedRow = Math.round(floatRow)
  const roundedCol = Math.round(floatCol)
  const candidates: CandidatePlacement[] = []

  for (let row = roundedRow - 2; row <= roundedRow + 2; row += 1) {
    for (let col = roundedCol - 2; col <= roundedCol + 2; col += 1) {
      pushCandidate(candidates, row, col, floatRow, floatCol)
    }
  }

  candidates.sort((left, right) => left.distance - right.distance)

  const buildPreview = (
    row: number,
    col: number,
    valid: boolean,
    snapped: boolean,
  ): PlacementPreview => {
    const { rowsCleared, colsCleared } =
      valid ? getPlacementClearLines(board, piece, row, col) : { rowsCleared: [], colsCleared: [] }

    return {
      row,
      col,
      cells: getAbsoluteCells(piece, row, col),
      valid,
      snapped,
      wouldClearRows: rowsCleared,
      wouldClearCols: colsCleared,
    }
  }

  const snappedCandidate = candidates.find(
    (candidate) =>
      candidate.distance <= CONFIG.snapRadius &&
      canPlacePiece(board, piece, candidate.row, candidate.col),
  )

  if (snappedCandidate) {
    return buildPreview(
      snappedCandidate.row,
      snappedCandidate.col,
      true,
      snappedCandidate.row !== roundedRow || snappedCandidate.col !== roundedCol,
    )
  }

  return buildPreview(
    roundedRow,
    roundedCol,
    canPlacePiece(board, piece, roundedRow, roundedCol),
    false,
  )
}
