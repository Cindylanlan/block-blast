import { canPlacePiece, createEmptyBoard, hasAnyPlacement, placePiece } from './board'
import { createTray } from './pieces'
import { calculateMoveScore } from './scoring'
import type { GameState, PlacementPosition } from './types'

const hasPlayablePiece = (state: GameState) =>
  state.tray.some((slot) => !slot.used && hasAnyPlacement(state.board, slot.piece))

export const createInitialGameState = (): GameState => {
  const state: GameState = {
    board: createEmptyBoard(),
    tray: createTray(),
    score: 0,
    status: 'playing',
    turn: 1,
    lastClearedRows: [],
    lastClearedCols: [],
  }

  if (!hasPlayablePiece(state)) {
    return {
      ...state,
      status: 'game-over',
    }
  }

  return state
}

export const placeTrayPiece = (
  state: GameState,
  slotId: string,
  position: PlacementPosition,
): GameState => {
  if (state.status === 'game-over') {
    return state
  }

  const slot = state.tray.find((item) => item.slotId === slotId)

  if (!slot || slot.used || !canPlacePiece(state.board, slot.piece, position.row, position.col)) {
    return state
  }

  const move = placePiece(state.board, slot.piece, position.row, position.col)
  const score = calculateMoveScore(
    move.placedCells.length,
    move.rowsCleared.length + move.colsCleared.length,
  )

  const updatedTray = state.tray.map((item) =>
    item.slotId === slotId
      ? {
          ...item,
          used: true,
        }
      : item,
  )

  const needsRefresh = updatedTray.every((item) => item.used)
  const nextTray = needsRefresh ? createTray() : updatedTray

  const nextState: GameState = {
    board: move.board,
    tray: nextTray,
    score: state.score + score.total,
    status: 'playing',
    turn: needsRefresh ? state.turn + 1 : state.turn,
    lastClearedRows: move.rowsCleared,
    lastClearedCols: move.colsCleared,
  }

  if (!hasPlayablePiece(nextState)) {
    return {
      ...nextState,
      status: 'game-over',
    }
  }

  return nextState
}
