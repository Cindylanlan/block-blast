/**
 * 方块数据：PIECE_LIBRARY 定义
 * 纯数据，不含 tray 生成等逻辑
 */
import type {
  PieceDefinition,
  PieceDifficulty,
  PieceFamily,
  PieceRole,
  TrayPiece,
} from './types'

interface PieceMeta {
  family: PieceFamily
  role: PieceRole
  difficulty: PieceDifficulty
  recoveryValue: number
  clearBias: number
  rarityWeight: number
}

const createPiece = (
  id: string,
  name: string,
  color: PieceDefinition['color'],
  cells: Array<[number, number]>,
  meta: PieceMeta,
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
    family: meta.family,
    role: meta.role,
    difficulty: meta.difficulty,
    recoveryValue: meta.recoveryValue,
    clearBias: meta.clearBias,
    rarityWeight: meta.rarityWeight,
  }
}

export const PIECE_LIBRARY: PieceDefinition[] = [
  createPiece('dot', 'Dot', 'sun', [[0, 0]], {
    family: 'single',
    role: 'rescue',
    difficulty: 'light',
    recoveryValue: 1,
    clearBias: 0.92,
    rarityWeight: 1.2,
  }),
  createPiece('line2h', 'Line 2 Horizontal', 'cyan', [
    [0, 0],
    [0, 1],
  ], {
    family: 'line',
    role: 'rescue',
    difficulty: 'light',
    recoveryValue: 0.96,
    clearBias: 0.88,
    rarityWeight: 1.34,
  }),
  createPiece('line3h', 'Line 3 Horizontal', 'blue', [
    [0, 0],
    [0, 1],
    [0, 2],
  ], {
    family: 'line',
    role: 'rescue',
    difficulty: 'light',
    recoveryValue: 0.8,
    clearBias: 0.84,
    rarityWeight: 1.18,
  }),
  createPiece('line4h', 'Line 4 Horizontal', 'purple', [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
  ], {
    family: 'line',
    role: 'builder',
    difficulty: 'medium',
    recoveryValue: 0.54,
    clearBias: 0.78,
    rarityWeight: 0.96,
  }),
  createPiece('line5h', 'Line 5 Horizontal', 'amber', [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
  ], {
    family: 'line',
    role: 'pressure',
    difficulty: 'heavy',
    recoveryValue: 0.24,
    clearBias: 0.7,
    rarityWeight: 0.62,
  }),
  createPiece('line2v', 'Line 2 Vertical', 'pink', [
    [0, 0],
    [1, 0],
  ], {
    family: 'line',
    role: 'rescue',
    difficulty: 'light',
    recoveryValue: 0.96,
    clearBias: 0.88,
    rarityWeight: 1.34,
  }),
  createPiece('line3v', 'Line 3 Vertical', 'green', [
    [0, 0],
    [1, 0],
    [2, 0],
  ], {
    family: 'line',
    role: 'rescue',
    difficulty: 'light',
    recoveryValue: 0.8,
    clearBias: 0.84,
    rarityWeight: 1.18,
  }),
  createPiece('line4v', 'Line 4 Vertical', 'cyan', [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
  ], {
    family: 'line',
    role: 'builder',
    difficulty: 'medium',
    recoveryValue: 0.54,
    clearBias: 0.78,
    rarityWeight: 0.96,
  }),
  createPiece('line5v', 'Line 5 Vertical', 'purple', [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
  ], {
    family: 'line',
    role: 'pressure',
    difficulty: 'heavy',
    recoveryValue: 0.24,
    clearBias: 0.7,
    rarityWeight: 0.62,
  }),
  createPiece('square2', 'Square 2x2', 'amber', [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ], {
    family: 'square',
    role: 'builder',
    difficulty: 'medium',
    recoveryValue: 0.58,
    clearBias: 0.52,
    rarityWeight: 1.18,
  }),
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
  ], {
    family: 'square',
    role: 'pressure',
    difficulty: 'heavy',
    recoveryValue: 0.12,
    clearBias: 0.34,
    rarityWeight: 0.34,
  }),
  createPiece('rect2x3', 'Rectangle 2x3', 'sun', [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 0],
    [1, 1],
    [1, 2],
  ], {
    family: 'rectangle',
    role: 'builder',
    difficulty: 'medium',
    recoveryValue: 0.36,
    clearBias: 0.46,
    rarityWeight: 0.92,
  }),
  createPiece('rect3x2', 'Rectangle 3x2', 'green', [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
    [2, 0],
    [2, 1],
  ], {
    family: 'rectangle',
    role: 'builder',
    difficulty: 'medium',
    recoveryValue: 0.36,
    clearBias: 0.46,
    rarityWeight: 0.92,
  }),
  createPiece('l3', 'L Small', 'green', [
    [0, 0],
    [1, 0],
    [1, 1],
  ], {
    family: 'l-shape',
    role: 'rescue',
    difficulty: 'light',
    recoveryValue: 0.78,
    clearBias: 0.64,
    rarityWeight: 0.52,
  }),
  createPiece('j3', 'J Small', 'pink', [
    [0, 1],
    [1, 0],
    [1, 1],
  ], {
    family: 'l-shape',
    role: 'rescue',
    difficulty: 'light',
    recoveryValue: 0.78,
    clearBias: 0.64,
    rarityWeight: 0.52,
  }),
  createPiece('l4', 'L Medium', 'pink', [
    [0, 0],
    [1, 0],
    [2, 0],
    [2, 1],
  ], {
    family: 'l-shape',
    role: 'builder',
    difficulty: 'medium',
    recoveryValue: 0.56,
    clearBias: 0.62,
    rarityWeight: 0.38,
  }),
  createPiece('l5', 'L Large', 'purple', [
    [0, 0],
    [1, 0],
    [2, 0],
    [2, 1],
    [2, 2],
  ], {
    family: 'l-shape',
    role: 'pressure',
    difficulty: 'heavy',
    recoveryValue: 0.24,
    clearBias: 0.54,
    rarityWeight: 0.18,
  }),
  createPiece('j5', 'J Large', 'cyan', [
    [0, 2],
    [1, 2],
    [2, 0],
    [2, 1],
    [2, 2],
  ], {
    family: 'l-shape',
    role: 'pressure',
    difficulty: 'heavy',
    recoveryValue: 0.24,
    clearBias: 0.54,
    rarityWeight: 0.18,
  }),
  createPiece('j4', 'J Medium', 'cyan', [
    [0, 1],
    [1, 1],
    [2, 1],
    [2, 0],
  ], {
    family: 'l-shape',
    role: 'builder',
    difficulty: 'medium',
    recoveryValue: 0.56,
    clearBias: 0.62,
    rarityWeight: 0.38,
  }),
  createPiece('t4', 'T Small', 'sun', [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 1],
  ], {
    family: 't-shape',
    role: 'builder',
    difficulty: 'medium',
    recoveryValue: 0.46,
    clearBias: 0.68,
    rarityWeight: 0.46,
  }),
  createPiece('t5', 'T Large', 'amber', [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, 2],
    [2, 1],
  ], {
    family: 't-shape',
    role: 'pressure',
    difficulty: 'heavy',
    recoveryValue: 0.18,
    clearBias: 0.66,
    rarityWeight: 0.18,
  }),
  createPiece('diag2', 'Diagonal 2', 'cyan', [
    [0, 0],
    [1, 1],
  ], {
    family: 'diagonal',
    role: 'rescue',
    difficulty: 'light',
    recoveryValue: 0.72,
    clearBias: 0.52,
    rarityWeight: 0.96,
  }),
  createPiece('diag3', 'Diagonal 3', 'purple', [
    [0, 0],
    [1, 1],
    [2, 2],
  ], {
    family: 'diagonal',
    role: 'builder',
    difficulty: 'medium',
    recoveryValue: 0.4,
    clearBias: 0.48,
    rarityWeight: 0.72,
  }),
  createPiece('s4', 'S Shape', 'blue', [
    [0, 1],
    [0, 2],
    [1, 0],
    [1, 1],
  ], {
    family: 'zigzag',
    role: 'wildcard',
    difficulty: 'medium',
    recoveryValue: 0.44,
    clearBias: 0.58,
    rarityWeight: 0.36,
  }),
  createPiece('z4', 'Z Shape', 'pink', [
    [0, 0],
    [0, 1],
    [1, 1],
    [1, 2],
  ], {
    family: 'zigzag',
    role: 'wildcard',
    difficulty: 'medium',
    recoveryValue: 0.44,
    clearBias: 0.58,
    rarityWeight: 0.36,
  }),
  createPiece('corner4', 'Corner', 'green', [
    [0, 0],
    [0, 1],
    [1, 0],
    [2, 0],
  ], {
    family: 'corner',
    role: 'wildcard',
    difficulty: 'medium',
    recoveryValue: 0.48,
    clearBias: 0.56,
    rarityWeight: 0.28,
  }),
  createPiece('corner4r', 'Corner Mirror', 'amber', [
    [0, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ], {
    family: 'corner',
    role: 'wildcard',
    difficulty: 'medium',
    recoveryValue: 0.48,
    clearBias: 0.56,
    rarityWeight: 0.28,
  }),
]

const createSlotId = (piece: PieceDefinition, index: number) =>
  `${piece.id}-${index}-${Math.random().toString(36).slice(2, 8)}`

export const createTrayFromPieces = (pieces: PieceDefinition[]): TrayPiece[] =>
  pieces.map((piece, index) => ({
    slotId: createSlotId(piece, index),
    piece,
    used: false,
  }))
