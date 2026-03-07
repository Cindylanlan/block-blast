export const BOARD_SIZE = 8
export const TRAY_SIZE = 3

export type PieceColor =
  | 'amber'
  | 'blue'
  | 'cyan'
  | 'green'
  | 'pink'
  | 'purple'
  | 'sun'

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
}

export interface MoveResult {
  board: BoardMatrix
  rowsCleared: number[]
  colsCleared: number[]
  placedCells: CellOffset[]
}

export interface ScoreBreakdown {
  placementPoints: number
  clearPoints: number
  comboPoints: number
  total: number
}

export interface GameState {
  board: BoardMatrix
  tray: TrayPiece[]
  score: number
  status: 'playing' | 'game-over'
  turn: number
  lastClearedRows: number[]
  lastClearedCols: number[]
}
