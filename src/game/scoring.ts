import type { ScoreBreakdown } from './types'

const CLEAR_LINE_POINTS = 18
const COMBO_BONUS_POINTS = 10

export const calculateMoveScore = (
  placedCellsCount: number,
  clearedLineCount: number,
): ScoreBreakdown => {
  const placementPoints = placedCellsCount
  const clearPoints = clearedLineCount * CLEAR_LINE_POINTS
  const comboPoints =
    clearedLineCount > 1 ? (clearedLineCount - 1) * COMBO_BONUS_POINTS : 0

  return {
    placementPoints,
    clearPoints,
    comboPoints,
    total: placementPoints + clearPoints + comboPoints,
  }
}
