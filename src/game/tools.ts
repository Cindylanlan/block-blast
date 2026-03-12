import { CONFIG } from './config'
import { BOARD_SIZE } from './types'
import type { BoardMatrix, CellOffset, ToolInventory, ToolType } from './types'

const clamp = (value: number) => Math.max(0, Math.min(BOARD_SIZE - 1, value))

export const createInitialToolInventory = (): ToolInventory => ({
  ...CONFIG.initialTools,
})

export const hasToolCharge = (inventory: ToolInventory, tool: ToolType): boolean =>
  inventory[tool] > 0

export const consumeToolCharge = (
  inventory: ToolInventory,
  tool: ToolType,
): ToolInventory => ({
  ...inventory,
  [tool]: Math.max(0, inventory[tool] - 1),
})

export const addToolCharge = (
  inventory: ToolInventory,
  tool: ToolType,
  amount: number,
): ToolInventory => ({
  ...inventory,
  [tool]: inventory[tool] + amount,
})

export const getHammerCells = (
  board: BoardMatrix,
  position: CellOffset,
): CellOffset[] => (board[position.row]?.[position.col] ? [position] : [])

export const getBombCells = (
  board: BoardMatrix,
  position: CellOffset,
): CellOffset[] => {
  const candidates: CellOffset[] = []

  for (let row = position.row - 1; row <= position.row + 1; row += 1) {
    for (let col = position.col - 1; col <= position.col + 1; col += 1) {
      const safeRow = clamp(row)
      const safeCol = clamp(col)

      if (board[safeRow][safeCol] !== null) {
        candidates.push({ row: safeRow, col: safeCol })
      }
    }
  }

  const unique = Array.from(
    new Map(candidates.map((cell) => [`${cell.row}-${cell.col}`, cell])).values(),
  )

  unique.sort(
    (left, right) =>
      Math.abs(left.row - position.row) +
        Math.abs(left.col - position.col) -
      (Math.abs(right.row - position.row) + Math.abs(right.col - position.col)),
  )

  return unique.slice(0, 4)
}
