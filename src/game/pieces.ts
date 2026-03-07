import { TRAY_SIZE } from './types'
import type { PieceDefinition, TrayPiece } from './types'

const createPiece = (
  id: string,
  name: string,
  color: PieceDefinition['color'],
  cells: Array<[number, number]>,
): PieceDefinition => {
  const normalized = cells.map(([row, col]) => ({ row, col }))
  const width = Math.max(...normalized.map((cell) => cell.col)) + 1
  const height = Math.max(...normalized.map((cell) => cell.row)) + 1

  return {
    id,
    name,
    color,
    cells: normalized,
    width,
    height,
  }
}

export const PIECE_LIBRARY: PieceDefinition[] = [
  createPiece('dot', 'Dot', 'sun', [[0, 0]]),
  createPiece('line2h', 'Line 2 Horizontal', 'cyan', [
    [0, 0],
    [0, 1],
  ]),
  createPiece('line3h', 'Line 3 Horizontal', 'blue', [
    [0, 0],
    [0, 1],
    [0, 2],
  ]),
  createPiece('line4h', 'Line 4 Horizontal', 'purple', [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
  ]),
  createPiece('line5h', 'Line 5 Horizontal', 'amber', [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
  ]),
  createPiece('line2v', 'Line 2 Vertical', 'pink', [
    [0, 0],
    [1, 0],
  ]),
  createPiece('line3v', 'Line 3 Vertical', 'green', [
    [0, 0],
    [1, 0],
    [2, 0],
  ]),
  createPiece('line4v', 'Line 4 Vertical', 'cyan', [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
  ]),
  createPiece('line5v', 'Line 5 Vertical', 'purple', [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
  ]),
  createPiece('square2', 'Square 2x2', 'amber', [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ]),
  createPiece('square3', 'Square 3x3', 'blue', [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 0],
    [1, 1],
    [1, 2],
    [2, 0],
    [2, 1],
    [2, 2],
  ]),
  createPiece('l3', 'L Small', 'green', [
    [0, 0],
    [1, 0],
    [1, 1],
  ]),
  createPiece('l4', 'L Medium', 'pink', [
    [0, 0],
    [1, 0],
    [2, 0],
    [2, 1],
  ]),
  createPiece('l5', 'L Large', 'purple', [
    [0, 0],
    [1, 0],
    [2, 0],
    [2, 1],
    [2, 2],
  ]),
  createPiece('j4', 'J Medium', 'cyan', [
    [0, 1],
    [1, 1],
    [2, 1],
    [2, 0],
  ]),
  createPiece('t4', 'T Small', 'sun', [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 1],
  ]),
  createPiece('t5', 'T Large', 'amber', [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, 2],
    [2, 1],
  ]),
  createPiece('s4', 'S Shape', 'blue', [
    [0, 1],
    [0, 2],
    [1, 0],
    [1, 1],
  ]),
  createPiece('z4', 'Z Shape', 'pink', [
    [0, 0],
    [0, 1],
    [1, 1],
    [1, 2],
  ]),
  createPiece('corner4', 'Corner', 'green', [
    [0, 0],
    [0, 1],
    [1, 0],
    [2, 0],
  ]),
]

const createSlotId = (piece: PieceDefinition, index: number) =>
  `${piece.id}-${index}-${Math.random().toString(36).slice(2, 8)}`

export const createTray = (): TrayPiece[] =>
  Array.from({ length: TRAY_SIZE }, (_, index) => {
    const piece =
      PIECE_LIBRARY[Math.floor(Math.random() * PIECE_LIBRARY.length)]

    return {
      slotId: createSlotId(piece, index),
      piece,
      used: false,
    }
  })
