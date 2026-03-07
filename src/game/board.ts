import { BOARD_SIZE } from './types'
import type { BoardMatrix, CellOffset, MoveResult, PieceDefinition } from './types'

export const createEmptyBoard = (): BoardMatrix =>
  Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null))

export const cloneBoard = (board: BoardMatrix): BoardMatrix =>
  board.map((row) => [...row])

export const getAbsoluteCells = (
  piece: PieceDefinition,
  originRow: number,
  originCol: number,
): CellOffset[] =>
  piece.cells.map((cell) => ({
    row: originRow + cell.row,
    col: originCol + cell.col,
  }))

export const canPlacePiece = (
  board: BoardMatrix,
  piece: PieceDefinition,
  originRow: number,
  originCol: number,
): boolean =>
  getAbsoluteCells(piece, originRow, originCol).every((cell) => {
    const insideBoard =
      cell.row >= 0 &&
      cell.row < BOARD_SIZE &&
      cell.col >= 0 &&
      cell.col < BOARD_SIZE

    return insideBoard && board[cell.row][cell.col] === null
  })

export const getCompletedLines = (board: BoardMatrix) => {
  const rowsCleared = board
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => row.every((cell) => cell !== null))
    .map(({ index }) => index)

  const colsCleared = Array.from({ length: BOARD_SIZE }, (_, colIndex) => colIndex)
    .filter((colIndex) => board.every((row) => row[colIndex] !== null))

  return { rowsCleared, colsCleared }
}

export const placePiece = (
  board: BoardMatrix,
  piece: PieceDefinition,
  originRow: number,
  originCol: number,
): MoveResult => {
  const nextBoard = cloneBoard(board)
  const placedCells = getAbsoluteCells(piece, originRow, originCol)

  for (const cell of placedCells) {
    nextBoard[cell.row][cell.col] = piece.color
  }

  const { rowsCleared, colsCleared } = getCompletedLines(nextBoard)

  for (const rowIndex of rowsCleared) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      nextBoard[rowIndex][col] = null
    }
  }

  for (const colIndex of colsCleared) {
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      nextBoard[row][colIndex] = null
    }
  }

  return {
    board: nextBoard,
    rowsCleared,
    colsCleared,
    placedCells,
  }
}

export const hasAnyPlacement = (
  board: BoardMatrix,
  piece: PieceDefinition,
): boolean => {
  for (let row = 0; row <= BOARD_SIZE - piece.height; row += 1) {
    for (let col = 0; col <= BOARD_SIZE - piece.width; col += 1) {
      if (canPlacePiece(board, piece, row, col)) {
        return true
      }
    }
  }

  return false
}
