import {
  canPlacePiece,
  createEmptyBoard,
  hasAnyPlacement,
  placePiece,
  removeCells,
} from './board'
import { createEventFactory } from './events'
import { createSimpleTray, PIECE_LIBRARY } from './pieces'
import { calculateMoveScore } from './scoring'
import {
  addToolCharge,
  consumeToolCharge,
  createInitialToolInventory,
  getBombCells,
  getHammerCells,
  hasToolCharge,
} from './tools'
import type { GameAction, GameEvent, GameState } from './types'

const hasPlayableTrayPiece = (board: GameState['board'], tray: GameState['tray']) =>
  tray.some((slot) => !slot.used && hasAnyPlacement(board, slot.piece))

const hasPlayablePiece = (state: GameState) => hasPlayableTrayPiece(state.board, state.tray)

const isTrayExhausted = (tray: GameState['tray']) => tray.every((slot) => slot.used)

const appendEvents = (state: GameState, events: GameEvent[]): GameState => ({
  ...state,
  recentEvents: events,
  eventSequence: events.length ? events[events.length - 1].id : state.eventSequence,
})

const buildTrayContext = (
  state: Pick<GameState, 'board' | 'turn' | 'noClearTurns' | 'recentPieceIds'>,
  reason: 'initial' | 'refresh' | 'reroll' | 'revive',
) => ({
  board: state.board,
  turn: state.turn,
  noClearTurns: state.noClearTurns,
  reason,
  recentPieceIds: state.recentPieceIds,
})

const rememberTrayPieces = (currentHistory: string[], tray: GameState['tray']) =>
  [...tray.map((slot) => slot.piece.id), ...currentHistory].slice(0, 8)

const isBoardTrulyDead = (board: GameState['board']) =>
  !PIECE_LIBRARY.some((piece) => hasAnyPlacement(board, piece))

export const createPlayableTray = (
  context: ReturnType<typeof buildTrayContext>,
) => {
  if (isBoardTrulyDead(context.board)) {
    return createSimpleTray(context)
  }
  return createSimpleTray(context)
}

const resolveTrayAfterTurn = ({
  state,
  board,
  tray,
  noClearTurns,
}: {
  state: Pick<GameState, 'turn' | 'noClearTurns' | 'recentPieceIds' | 'tray'>
  board: GameState['board']
  tray: GameState['tray']
  noClearTurns: number
}) => {
  if (!isTrayExhausted(tray)) {
    return {
      tray,
      turn: state.turn,
      recentPieceIds: state.recentPieceIds,
      refreshed: false,
    }
  }

  if (isBoardTrulyDead(board)) {
    return {
      tray,
      turn: state.turn,
      recentPieceIds: state.recentPieceIds,
      refreshed: false,
    }
  }

  const nextTurn = state.turn + 1
  const nextTray = createPlayableTray({
    board,
    turn: nextTurn,
    noClearTurns,
    reason: 'refresh',
    recentPieceIds: state.recentPieceIds,
  })

  return {
    tray: nextTray,
    turn: nextTurn,
    recentPieceIds: rememberTrayPieces(state.recentPieceIds, nextTray),
    refreshed: true,
  }
}

export const createInitialGameState = (): GameState => {
  const board = createEmptyBoard()
  const tray = createPlayableTray({
    board,
    turn: 1,
    noClearTurns: 0,
    reason: 'initial',
    recentPieceIds: [],
  })
  const state: GameState = {
    board,
    tray,
    score: 0,
    status: 'playing',
    turn: 1,
    comboStreak: 0,
    comboGraceUsed: false,
    lastActionCleared: false,
    lastClearedRows: [],
    lastClearedCols: [],
    lastClearedCells: [],
    lastScoreBreakdown: null,
    noClearTurns: 0,
    recentPieceIds: rememberTrayPieces([], tray),
    toolInventory: createInitialToolInventory(),
    eventSequence: 0,
    recentEvents: [],
  }

  if (!hasPlayablePiece(state)) {
    return {
      ...state,
      status: 'game-over',
    }
  }

  return state
}

const finalizeState = (
  state: GameState,
): GameState => {
  const events = [...state.recentEvents]
  const createEvent = createEventFactory(state.eventSequence)

  if (isTrayExhausted(state.tray) && !isBoardTrulyDead(state.board)) {
    const refreshed = resolveTrayAfterTurn({
      state,
      board: state.board,
      tray: state.tray,
      noClearTurns: state.noClearTurns,
    })

    if (refreshed.refreshed) {
      return {
        ...state,
        tray: refreshed.tray,
        turn: refreshed.turn,
        recentPieceIds: refreshed.recentPieceIds,
      }
    }
  }

  if (hasPlayablePiece(state)) {
    return state
  }

  return appendEvents(
    {
      ...state,
      status: 'game-over',
    },
    [...events, createEvent({ type: 'gameOver' })],
  )
}

const placePieceAction = (state: GameState, action: Extract<GameAction, { type: 'place-piece' }>) => {
  if (state.status === 'game-over') {
    return state
  }

  const slot = state.tray.find((item) => item.slotId === action.slotId)

  if (!slot || slot.used || !canPlacePiece(state.board, slot.piece, action.position.row, action.position.col)) {
    return appendEvents({ ...state, recentEvents: [] }, [])
  }

  const createEvent = createEventFactory(state.eventSequence)
  const move = placePiece(state.board, slot.piece, action.position.row, action.position.col)
  const lineCount = move.rowsCleared.length + move.colsCleared.length

  let comboStreak: number
  let comboGraceUsed: boolean
  if (lineCount > 0) {
    comboStreak = state.comboGraceUsed ? 1 : state.comboStreak + 1
    comboGraceUsed = false
  } else {
    if (state.comboGraceUsed) {
      comboStreak = 0
      comboGraceUsed = false
    } else {
      comboStreak = state.comboStreak
      comboGraceUsed = true
    }
  }

  const score = calculateMoveScore(
    move.placedCells.length,
    lineCount,
    comboStreak,
  )

  const updatedTray = state.tray.map((item) =>
    item.slotId === action.slotId
      ? {
          ...item,
          used: true,
        }
      : item,
  )

  const nextNoClearTurns = lineCount > 0 ? 0 : state.noClearTurns + 1
  const trayResolution = resolveTrayAfterTurn({
    state,
    board: move.board,
    tray: updatedTray,
    noClearTurns: nextNoClearTurns,
  })
  const recentEvents: GameEvent[] = [
    createEvent({
      type: 'piecePlaced',
      slotId: action.slotId,
      placedCells: move.placedCells,
    }),
  ]

  if (lineCount > 0) {
    recentEvents.push(
      createEvent({
        type: 'linesCleared',
        rows: move.rowsCleared,
        cols: move.colsCleared,
        clearedCells: move.clearedCells,
        clearedBlocks: move.clearedBlocks,
        lineCount,
      }),
    )

    if (comboStreak > 1 || lineCount > 1) {
      recentEvents.push(
        createEvent({
          type: 'comboAdvanced',
          comboStreak,
          clearedLineCount: lineCount,
        }),
      )
    }
  }

  if (score.total > 0) {
    recentEvents.push(
      createEvent({
        type: 'score',
        amount: score.total,
        breakdown: score,
        sourceCells: move.clearedCells.length ? move.clearedCells : move.placedCells,
      }),
    )
  }

  if (trayResolution.refreshed) {
    recentEvents.push(createEvent({ type: 'trayRerolled' }))
  }

  const nextState: GameState = {
    board: move.board,
    tray: trayResolution.tray,
    score: state.score + score.total,
    status: 'playing',
    turn: trayResolution.turn,
    comboStreak,
    comboGraceUsed,
    lastActionCleared: lineCount > 0,
    lastClearedRows: move.rowsCleared,
    lastClearedCols: move.colsCleared,
    lastClearedCells: move.clearedCells,
    lastScoreBreakdown: score,
    noClearTurns: nextNoClearTurns,
    recentPieceIds: trayResolution.recentPieceIds,
    toolInventory: state.toolInventory,
    eventSequence: recentEvents[recentEvents.length - 1]?.id ?? state.eventSequence,
    recentEvents,
  }

  return finalizeState(nextState)
}

const rerollTrayAction = (state: GameState) => {
  if (state.status === 'game-over' || !hasToolCharge(state.toolInventory, 'reroll')) {
    return state
  }

  const createEvent = createEventFactory(state.eventSequence)
  const recentEvents = [
    createEvent({ type: 'toolUsed', tool: 'reroll', affectedCells: [] }),
    createEvent({ type: 'trayRerolled' }),
  ]
  const nextTray = createPlayableTray(buildTrayContext(state, 'reroll'))

  const nextState: GameState = {
    ...state,
    tray: nextTray,
    comboStreak: 0,
    comboGraceUsed: false,
    lastActionCleared: false,
    lastClearedRows: [],
    lastClearedCols: [],
    lastClearedCells: [],
    lastScoreBreakdown: null,
    recentPieceIds: rememberTrayPieces(state.recentPieceIds, nextTray),
    toolInventory: consumeToolCharge(state.toolInventory, 'reroll'),
    recentEvents,
    eventSequence: recentEvents[recentEvents.length - 1]?.id ?? state.eventSequence,
  }

  return finalizeState(nextState)
}

const applyToolAction = (state: GameState, action: Extract<GameAction, { type: 'use-tool' }>) => {
  if (state.status === 'game-over' || !hasToolCharge(state.toolInventory, action.tool)) {
    return state
  }

  const affectedCells =
    action.tool === 'hammer'
      ? getHammerCells(state.board, action.position)
      : getBombCells(state.board, action.position)

  if (!affectedCells.length) {
    return appendEvents({ ...state, recentEvents: [] }, [])
  }

  const createEvent = createEventFactory(state.eventSequence)
  const nextBoard = removeCells(state.board, affectedCells)
  const score = calculateMoveScore(0, 0, 0)
  const recentEvents = [
    createEvent({
      type: 'toolUsed',
      tool: action.tool,
      affectedCells,
    }),
  ]

  const nextState: GameState = {
    ...state,
    board: nextBoard,
    comboStreak: 0,
    comboGraceUsed: false,
    lastActionCleared: false,
    lastClearedRows: [],
    lastClearedCols: [],
    lastClearedCells: affectedCells,
    lastScoreBreakdown: score,
    noClearTurns: state.noClearTurns + 1,
    toolInventory: consumeToolCharge(state.toolInventory, action.tool),
    recentEvents,
    eventSequence: recentEvents[recentEvents.length - 1]?.id ?? state.eventSequence,
  }

  return finalizeState(nextState)
}

const grantRewardAction = (state: GameState, action: Extract<GameAction, { type: 'grant-reward' }>) => {
  const createEvent = createEventFactory(state.eventSequence)

  const recentEvents = [
    createEvent({
      type: 'rewardGranted',
      reward: action.reward,
    }),
  ]

  return {
    ...state,
    toolInventory: addToolCharge(
      state.toolInventory,
      action.reward.tool,
      action.reward.amount,
    ),
    recentEvents,
    eventSequence: recentEvents[recentEvents.length - 1]?.id ?? state.eventSequence,
  }
}

const reviveGameAction = (state: GameState): GameState => {
  if (state.status !== 'game-over') {
    return state
  }

  const createEvent = createEventFactory(state.eventSequence)
  const recentEvents = [createEvent({ type: 'revived' })]
  const nextTray = createPlayableTray(buildTrayContext(state, 'revive'))

  return {
    ...state,
    tray: nextTray,
    status: 'playing',
    comboStreak: 0,
    comboGraceUsed: false,
    lastActionCleared: false,
    lastClearedRows: [],
    lastClearedCols: [],
    lastClearedCells: [],
    lastScoreBreakdown: null,
    noClearTurns: 0,
    recentPieceIds: rememberTrayPieces(state.recentPieceIds, nextTray),
    recentEvents,
    eventSequence: recentEvents[recentEvents.length - 1]?.id ?? state.eventSequence,
  }
}

export const applyGameAction = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'place-piece':
      return placePieceAction(state, action)
    case 'reroll-tray':
      return rerollTrayAction(state)
    case 'use-tool':
      return applyToolAction(state, action)
    case 'grant-reward':
      return grantRewardAction(state, action)
    case 'revive-game':
      return reviveGameAction(state)
    default:
      return state
  }
}
