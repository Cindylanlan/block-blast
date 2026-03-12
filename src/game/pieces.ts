/**
 * 方块模块入口：re-export 自 piecesData 和 piecesLogic
 */
export { PIECE_LIBRARY, createTrayFromPieces } from './piecesData'
export { createSimpleTray, createTray } from './piecesLogic'
export type { StrategicTrayContext } from './piecesLogic'
