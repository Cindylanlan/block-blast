/**
 * 方块逻辑：tray 生成、createSimpleTray、createTray 等
 */
import { evaluateBoardPressure, hasAnyPlacement } from './board'
import { PIECE_LIBRARY, createTrayFromPieces } from './piecesData'
import { TRAY_SIZE } from './types'
import type {
  BoardMatrix,
  BoardPressureLevel,
  PieceDefinition,
  PieceRole,
  TrayPiece,
} from './types'

type TrayGenerationReason = 'initial' | 'refresh' | 'reroll' | 'revive'

type DifficultyPhase = 'early' | 'mid' | 'late'

export interface StrategicTrayContext {
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
  if (turn <= 4) return 'early'
  if (turn <= 10) return 'mid'
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
  if (context.reason === 'revive' || pressure === 'danger') return false
  if (phase === 'early') return true
  if (phase === 'mid') return context.turn % 2 === 1
  return context.turn % 4 === 0
}

const getSlotRolePlan = (
  phase: DifficultyPhase,
  pressure: BoardPressureLevel,
  reason: TrayGenerationReason,
): PieceRole[][] => {
  if (reason === 'revive') return [['rescue'], ['builder'], ['builder', 'wildcard']]
  if (reason === 'reroll') {
    return pressure === 'danger'
      ? [['rescue'], ['builder'], ['builder', 'wildcard']]
      : [['builder'], ['rescue', 'builder'], ['builder', 'wildcard', 'pressure']]
  }
  if (pressure === 'danger') return [['rescue'], ['builder'], ['builder', 'wildcard']]
  if (phase === 'early') return [['builder'], ['builder', 'wildcard'], ['builder', 'pressure']]
  if (phase === 'mid') return [['builder'], ['rescue', 'builder'], ['builder', 'wildcard', 'pressure']]
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
  if (reason === 'reroll' && piece.role === 'rescue') return 1.32
  if (pressure === 'danger') {
    return piece.role === 'pressure' ? 0.22 : piece.role === 'rescue' ? 1.48 : 1.18
  }
  if (phase === 'early') {
    if (isSmallRescuePiece(piece)) return 0.46
    if (isStarterLargePiece(piece)) return piece.id === 'square3' || piece.cells.length >= 5 ? 1.42 : 1.32
    if (piece.role === 'pressure') return 0.92
    return piece.family === 'square' || piece.family === 'rectangle' || piece.family === 'line' ? 1.12 : 0.88
  }
  if (phase === 'mid') {
    if (isSmallRescuePiece(piece)) return 1.18
    if (isStarterLargePiece(piece)) return 1.14
    return piece.role === 'pressure'
      ? 0.84
      : piece.family === 'square' || piece.family === 'rectangle' || piece.family === 'line'
        ? 1.04
        : 0.94
  }
  if (isSmallRescuePiece(piece)) return 1.08
  if (isStarterLargePiece(piece)) return 0.94
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

/** 简化版：槽位 1 保证可放，槽位 2、3 按角色加权选取 */
export const createSimpleTray = (context: StrategicTrayContext): TrayPiece[] => {
  const { board } = context
  const playable = PIECE_LIBRARY.find((p) => hasAnyPlacement(board, p))
  if (!playable) return createTray()

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
    const piece = PIECE_LIBRARY[Math.floor(Math.random() * PIECE_LIBRARY.length)]
    return {
      slotId: `${piece.id}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      piece,
      used: false,
    }
  })
