import type { ScoreBreakdown } from './types'

const CLEAR_LINE_POINTS = 18
const MULTI_CLEAR_BONUS_POINTS = 12
const COMBO_STREAK_BONUS_POINTS = 16

export const calculateMoveScore = (
  placedCellsCount: number,
  clearedLineCount: number,
  comboStreak: number,
): ScoreBreakdown => {
  const placementPoints = placedCellsCount
  const clearPoints = clearedLineCount * CLEAR_LINE_POINTS
  const multiClearBonusPoints =
    clearedLineCount > 1 ? (clearedLineCount - 1) * MULTI_CLEAR_BONUS_POINTS : 0
  const comboPoints =
    clearedLineCount > 0 && comboStreak > 1 ? (comboStreak - 1) * COMBO_STREAK_BONUS_POINTS : 0
  const label =
    comboStreak > 1
      ? `Combo x${comboStreak}`
      : clearedLineCount > 1
        ? `Line Blast x${clearedLineCount}`
        : clearedLineCount === 1
          ? 'Clear'
          : null

  return {
    placementPoints,
    clearPoints,
    multiClearBonusPoints,
    comboPoints,
    comboStreak,
    clearedLineCount,
    label,
    total: placementPoints + clearPoints + multiClearBonusPoints + comboPoints,
  }
}
