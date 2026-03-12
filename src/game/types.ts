import { CONFIG } from './config'

export const BOARD_SIZE = CONFIG.boardSize
export const TRAY_SIZE = CONFIG.traySize

export type PieceColor =
  | 'amber'
  | 'blue'
  | 'cyan'
  | 'green'
  | 'pink'
  | 'purple'
  | 'sun'

export type PieceFamily =
  | 'single'
  | 'line'
  | 'square'
  | 'rectangle'
  | 'diagonal'
  | 'corner'
  | 'l-shape'
  | 't-shape'
  | 'zigzag'

export type PieceRole = 'rescue' | 'builder' | 'pressure' | 'wildcard'

export type PieceDifficulty = 'light' | 'medium' | 'heavy'

export type BoardPressureLevel = 'safe' | 'tense' | 'danger'

export interface CellOffset {
  row: number
  col: number
}

export interface PieceDefinition {
  id: string
  name: string
  cells: CellOffset[]
  color: PieceColor
  width: number
  height: number
  family: PieceFamily
  role: PieceRole
  difficulty: PieceDifficulty
  recoveryValue: number
  clearBias: number
  rarityWeight: number
}

export interface TrayPiece {
  slotId: string
  piece: PieceDefinition
  used: boolean
}

export type BoardCell = PieceColor | null
export type BoardMatrix = BoardCell[][]

export interface PlacementPosition {
  row: number
  col: number
}

export interface PlacementPreview extends PlacementPosition {
  valid: boolean
  cells: CellOffset[]
  snapped: boolean
  wouldClearRows: number[]
  wouldClearCols: number[]
}

export interface MoveResult {
  board: BoardMatrix
  rowsCleared: number[]
  colsCleared: number[]
  placedCells: CellOffset[]
  clearedCells: CellOffset[]
  clearedBlocks: ClearedBlockSnapshot[]
}

export interface ClearedBlockSnapshot extends CellOffset {
  color: PieceColor
  clearedByRow: boolean
  clearedByCol: boolean
}

export interface ScoreBreakdown {
  placementPoints: number
  clearPoints: number
  multiClearBonusPoints: number
  comboPoints: number
  comboStreak: number
  clearedLineCount: number
  label: string | null
  total: number
}

export type ToolType = 'reroll' | 'bomb' | 'hammer'

export interface ToolInventory {
  reroll: number
  bomb: number
  hammer: number
}

export type RewardSource = 'rewarded-ad' | 'shop-pack'

export interface RewardGrant {
  tool: ToolType
  amount: number
  source: RewardSource
}

export type GameEvent =
  | {
      id: number
      type: 'piecePlaced'
      slotId: string
      placedCells: CellOffset[]
    }
  | {
      id: number
      type: 'linesCleared'
      rows: number[]
      cols: number[]
      clearedCells: CellOffset[]
      clearedBlocks: ClearedBlockSnapshot[]
      lineCount: number
    }
  | {
      id: number
      type: 'comboAdvanced'
      comboStreak: number
      clearedLineCount: number
    }
  | {
      id: number
      type: 'toolUsed'
      tool: ToolType
      affectedCells: CellOffset[]
    }
  | {
      id: number
      type: 'trayRerolled'
    }
  | {
      id: number
      type: 'score'
      amount: number
      breakdown: ScoreBreakdown
      sourceCells: CellOffset[]
    }
  | {
      id: number
      type: 'rewardGranted'
      reward: RewardGrant
    }
  | {
      id: number
      type: 'gameOver'
    }
  | {
      id: number
      type: 'revived'
    }

export type GameAction =
  | {
      type: 'place-piece'
      slotId: string
      position: PlacementPosition
    }
  | {
      type: 'use-tool'
      tool: Exclude<ToolType, 'reroll'>
      position: PlacementPosition
    }
  | {
      type: 'reroll-tray'
    }
  | {
      type: 'grant-reward'
      reward: RewardGrant
    }
  | {
      type: 'revive-game'
    }

export interface GameState {
  board: BoardMatrix
  tray: TrayPiece[]
  score: number
  status: 'playing' | 'game-over'
  turn: number
  comboStreak: number
  comboGraceUsed: boolean
  lastActionCleared: boolean
  lastClearedRows: number[]
  lastClearedCols: number[]
  lastClearedCells: CellOffset[]
  lastScoreBreakdown: ScoreBreakdown | null
  noClearTurns: number
  recentPieceIds: string[]
  toolInventory: ToolInventory
  eventSequence: number
  recentEvents: GameEvent[]
}
