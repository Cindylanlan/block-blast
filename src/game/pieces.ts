import {
  evaluateBoardPressure,
  hasAnyPlacement,
} from './board'
import { TRAY_SIZE } from './types'
import type {
  BoardMatrix,
  BoardPressureLevel,
  PieceDefinition,
  PieceDifficulty,
  PieceFamily,
  PieceRole,
  TrayPiece,
} from './types'

type TrayGenerationReason = 'initial' | 'refresh' | 'reroll' | 'revive'

type DifficultyPhase = 'early' | 'mid' | 'late'

interface PieceMeta {
  family: PieceFamily
  role: PieceRole
  difficulty: PieceDifficulty
  recoveryValue: number
  clearBias: number
  rarityWeight: number
}

interface StrategicTrayContext {
  board: BoardMatrix
  turn: number
  noClearTurns: number
  reason: TrayGenerationReason
  recentPieceIds: string[]
}

const STARTER_LARGE_PIECE_IDS = new Set([
  'square2',
  'square3',
  'rect2x3',
  'rect3x2',
  'line4h',
  'line4v',
  'line5h',
  'line5v',
])

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

const createTrayFromPieces = (pieces: PieceDefinition[]): TrayPiece[] =>
  pieces.map((piece, index) => ({
    slotId: createSlotId(piece, index),
    piece,
    used: false,
  }))

const weightedPick = (pieces: PieceDefinition[], getWeight: (piece: PieceDefinition) => number) => {
  const weighted = pieces
    .map((piece) => ({ piece, weight: Math.max(0, getWeight(piece)) }))
    .filter((entry) => entry.weight > 0)

  if (!weighted.length) {
    return null
  }

  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0)
  let threshold = Math.random() * totalWeight

  for (const entry of weighted) {
    threshold -= entry.weight
    if (threshold <= 0) {
      return entry.piece
    }
  }

  return weighted[weighted.length - 1].piece
}

const getDifficultyPhase = (turn: number): DifficultyPhase => {
  if (turn <= 4) {
    return 'early'
  }

  if (turn <= 10) {
    return 'mid'
  }

  return 'late'
}

const isStarterLargePiece = (piece: PieceDefinition) => STARTER_LARGE_PIECE_IDS.has(piece.id)

const isSmallRescuePiece = (piece: PieceDefinition) =>
  piece.role === 'rescue' && (piece.cells.length <= 3 || piece.family === 'single')

const shouldFeatureStarterLarge = (
  context: StrategicTrayContext,
  phase: DifficultyPhase,
  pressure: BoardPressureLevel,
) => {
  if (context.reason === 'revive' || pressure === 'danger') {
    return false
  }

  if (phase === 'early') {
    return true
  }

  if (phase === 'mid') {
    return context.turn % 2 === 1
  }

  return context.turn % 4 === 0
}

const getSlotRolePlan = (
  phase: DifficultyPhase,
  pressure: BoardPressureLevel,
  reason: TrayGenerationReason,
): PieceRole[][] => {
  if (reason === 'revive') {
    return [['rescue'], ['builder'], ['builder', 'wildcard']]
  }

  if (reason === 'reroll') {
    return pressure === 'danger'
      ? [['rescue'], ['builder'], ['builder', 'wildcard']]
      : [['builder'], ['rescue', 'builder'], ['builder', 'wildcard', 'pressure']]
  }

  if (pressure === 'danger') {
    return [['rescue'], ['builder'], ['builder', 'wildcard']]
  }

  if (phase === 'early') {
    return [['builder'], ['builder', 'wildcard'], ['builder', 'pressure']]
  }

  if (phase === 'mid') {
    return [['builder'], ['rescue', 'builder'], ['builder', 'wildcard', 'pressure']]
  }

  return [['rescue'], ['builder'], ['builder', 'wildcard', 'pressure']]
}

const getPhaseWeightMultiplier = (
  piece: PieceDefinition,
  phase: DifficultyPhase,
  pressure: BoardPressureLevel,
  reason: TrayGenerationReason,
) => {
  if (reason === 'revive') {
    return piece.role === 'rescue' ? 1.7 : piece.role === 'pressure' ? 0.35 : 1.2
  }

  if (reason === 'reroll' && piece.role === 'rescue') {
    return 1.32
  }

  if (pressure === 'danger') {
    return piece.role === 'pressure'
      ? 0.22
      : piece.role === 'rescue'
        ? 1.48
        : 1.18
  }

  if (phase === 'early') {
    if (isSmallRescuePiece(piece)) {
      return 0.46
    }

    if (isStarterLargePiece(piece)) {
      return piece.id === 'square3' || piece.cells.length >= 5 ? 1.42 : 1.32
    }

    if (piece.role === 'pressure') {
      return 0.92
    }

    return piece.family === 'square' || piece.family === 'rectangle' || piece.family === 'line'
      ? 1.12
      : 0.88
  }

  if (phase === 'mid') {
    if (isSmallRescuePiece(piece)) {
      return 1.18
    }

    if (isStarterLargePiece(piece)) {
      return 1.14
    }

    return piece.role === 'pressure'
      ? 0.84
      : piece.family === 'square' || piece.family === 'rectangle' || piece.family === 'line'
        ? 1.04
        : 0.94
  }

  if (isSmallRescuePiece(piece)) {
    return 1.08
  }

  if (isStarterLargePiece(piece)) {
    return 0.94
  }

  return piece.role === 'pressure'
    ? 1.06
    : piece.family === 'square' || piece.family === 'rectangle' || piece.family === 'line'
      ? 1.02
      : 0.9
}

const pickCandidatePiece = (
  allowedRoles: PieceRole[],
  usedIds: Set<string>,
  context: StrategicTrayContext,
): PieceDefinition => {
  const pressure = evaluateBoardPressure(context.board)
  const phase = getDifficultyPhase(context.turn)
  const filtered = PIECE_LIBRARY.filter(
    (piece) => allowedRoles.includes(piece.role) && !usedIds.has(piece.id),
  )
  const fallback = PIECE_LIBRARY.filter((piece) => !usedIds.has(piece.id))
  const pool = filtered.length ? filtered : fallback

  const picked =
    weightedPick(pool, (piece) => {
      const recentPenalty = context.recentPieceIds.includes(piece.id) ? 0.34 : 1
      const droughtBoost =
        context.noClearTurns >= 2 && piece.role === 'rescue'
          ? 1 + context.noClearTurns * 0.18
          : 1

      return (
        piece.rarityWeight *
        getPhaseWeightMultiplier(piece, phase, pressure.level, context.reason) *
        recentPenalty *
        droughtBoost
      )
    }) ?? pool[0]

  return picked
}

/** 简化版：槽位 1 保证可放，槽位 2、3 按角色加权选取，一次生成 */
export const createSimpleTray = (context: StrategicTrayContext): TrayPiece[] => {
  const { board } = context
  const playable = PIECE_LIBRARY.find((p) => hasAnyPlacement(board, p))
  if (!playable) {
    return createTray()
  }

  const pressure = evaluateBoardPressure(board)
  const phase = getDifficultyPhase(context.turn)
  const rolePlan = getSlotRolePlan(phase, pressure.level, context.reason)
  const usedIds = new Set([playable.id])

  const slot2 = pickCandidatePiece(rolePlan[1], usedIds, context)
  usedIds.add(slot2.id)
  const slot3 = pickCandidatePiece(rolePlan[2], usedIds, context)

  let pieces = [playable, slot2, slot3]
  if (shouldFeatureStarterLarge(context, phase, pressure.level) && !pieces.some(isStarterLargePiece)) {
    const replacementPool = PIECE_LIBRARY.filter(
      (piece) => isStarterLargePiece(piece) && !usedIds.has(piece.id),
    )
    const replacement =
      weightedPick(replacementPool, (piece) => {
        const recentPenalty = context.recentPieceIds.includes(piece.id) ? 0.48 : 1
        return piece.rarityWeight * getPhaseWeightMultiplier(piece, phase, pressure.level, context.reason) * recentPenalty
      }) ?? replacementPool[0]
    if (replacement) {
      const replaceIndex = pieces.findIndex((piece) => !isSmallRescuePiece(piece))
      const targetIndex = replaceIndex >= 0 ? replaceIndex : pieces.length - 1
      pieces = [...pieces]
      pieces[targetIndex] = replacement
    }
  }

  return createTrayFromPieces(pieces)
}

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

