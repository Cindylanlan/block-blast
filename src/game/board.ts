import { BOARD_SIZE } from './types'
import type {
  BoardMatrix,
  BoardPressureLevel,
  ClearedBlockSnapshot,
  CellOffset,
  MoveResult,
  PieceDefinition,
  PlacementPosition,
} from './types'

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

export const getPlacementClearLines = (
  board: BoardMatrix,
  piece: PieceDefinition,
  originRow: number,
  originCol: number,
) => {
  const nextBoard = cloneBoard(board)
  const placedCells = getAbsoluteCells(piece, originRow, originCol)

  for (const cell of placedCells) {
    nextBoard[cell.row][cell.col] = piece.color
  }

  return getCompletedLines(nextBoard)
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
  const clearedCells = collectClearedCells(nextBoard, rowsCleared, colsCleared)
  const clearedBlocks = collectClearedBlocks(nextBoard, rowsCleared, colsCleared)

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
    clearedCells,
    clearedBlocks,
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

export const getValidPlacements = (
  board: BoardMatrix,
  piece: PieceDefinition,
): PlacementPosition[] => {
  const placements: PlacementPosition[] = []

  for (let row = 0; row <= BOARD_SIZE - piece.height; row += 1) {
    for (let col = 0; col <= BOARD_SIZE - piece.width; col += 1) {
      if (canPlacePiece(board, piece, row, col)) {
        placements.push({ row, col })
      }
    }
  }

  return placements
}

export const getPlacementCount = (board: BoardMatrix, piece: PieceDefinition) =>
  getValidPlacements(board, piece).length

const countNearCompleteLines = (board: BoardMatrix, maxMissingCells: number) => {
  let total = 0

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    const emptyCount = board[row].filter((cell) => cell === null).length
    if (emptyCount > 0 && emptyCount <= maxMissingCells) {
      total += 1
    }
  }

  for (let col = 0; col < BOARD_SIZE; col += 1) {
    let emptyCount = 0
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      if (board[row][col] === null) {
        emptyCount += 1
      }
    }

    if (emptyCount > 0 && emptyCount <= maxMissingCells) {
      total += 1
    }
  }

  return total
}

const countEmptyWindows = (board: BoardMatrix, height: number, width: number) => {
  let count = 0

  for (let row = 0; row <= BOARD_SIZE - height; row += 1) {
    for (let col = 0; col <= BOARD_SIZE - width; col += 1) {
      let clear = true

      for (let innerRow = row; innerRow < row + height && clear; innerRow += 1) {
        for (let innerCol = col; innerCol < col + width; innerCol += 1) {
          if (board[innerRow][innerCol] !== null) {
            clear = false
            break
          }
        }
      }

      if (clear) {
        count += 1
      }
    }
  }

  return count
}

export interface BoardPressureSnapshot {
  occupiedRatio: number
  totalEmptyCells: number
  nearClearLines: number
  openThreeByThreeZones: number
  openLongLaneCount: number
  pressureScore: number
  level: BoardPressureLevel
}

export const evaluateBoardPressure = (board: BoardMatrix): BoardPressureSnapshot => {
  const occupiedCells = getOccupiedCells(board).length
  const totalCells = BOARD_SIZE * BOARD_SIZE
  const occupiedRatio = occupiedCells / totalCells
  const totalEmptyCells = totalCells - occupiedCells
  const nearClearLines = countNearCompleteLines(board, 2)
  const openThreeByThreeZones = countEmptyWindows(board, 3, 3)
  const openLongLaneCount = countEmptyWindows(board, 1, 4) + countEmptyWindows(board, 4, 1)

  const pressureScore =
    occupiedRatio * 1.2 -
    nearClearLines * 0.12 -
    Math.min(openThreeByThreeZones, 3) * 0.16 -
    Math.min(openLongLaneCount, 6) * 0.04

  const level: BoardPressureLevel =
    pressureScore >= 0.72 ? 'danger' : pressureScore >= 0.42 ? 'tense' : 'safe'

  return {
    occupiedRatio,
    totalEmptyCells,
    nearClearLines,
    openThreeByThreeZones,
    openLongLaneCount,
    pressureScore,
    level,
  }
}

export const collectClearedCells = (
  board: BoardMatrix,
  rowsCleared: number[],
  colsCleared: number[],
): CellOffset[] => {
  const cells = new Map<string, CellOffset>()

  for (const row of rowsCleared) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (board[row][col] !== null) {
        cells.set(`${row}-${col}`, { row, col })
      }
    }
  }

  for (const col of colsCleared) {
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      if (board[row][col] !== null) {
        cells.set(`${row}-${col}`, { row, col })
      }
    }
  }

  return Array.from(cells.values())
}

export const collectClearedBlocks = (
  board: BoardMatrix,
  rowsCleared: number[],
  colsCleared: number[],
): ClearedBlockSnapshot[] => {
  const blocks = new Map<string, ClearedBlockSnapshot>()

  for (const row of rowsCleared) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const color = board[row][col]
      if (color !== null) {
        blocks.set(`${row}-${col}`, {
          row,
          col,
          color,
          clearedByRow: true,
          clearedByCol: colsCleared.includes(col),
        })
      }
    }
  }

  for (const col of colsCleared) {
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      const color = board[row][col]
      if (color !== null) {
        const key = `${row}-${col}`
        const existing = blocks.get(key)
        blocks.set(key, {
          row,
          col,
          color,
          clearedByRow: existing?.clearedByRow ?? rowsCleared.includes(row),
          clearedByCol: true,
        })
      }
    }
  }

  return Array.from(blocks.values())
}

export const removeCells = (board: BoardMatrix, cells: CellOffset[]): BoardMatrix => {
  const nextBoard = cloneBoard(board)

  for (const cell of cells) {
    if (
      cell.row >= 0 &&
      cell.row < BOARD_SIZE &&
      cell.col >= 0 &&
      cell.col < BOARD_SIZE
    ) {
      nextBoard[cell.row][cell.col] = null
    }
  }

  return nextBoard
}

export const getOccupiedCells = (board: BoardMatrix): CellOffset[] => {
  const cells: CellOffset[] = []

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (board[row][col] !== null) {
        cells.push({ row, col })
      }
    }
  }

  return cells
}
