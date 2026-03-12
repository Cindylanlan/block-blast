import { CONFIG } from './config'
import type { ScoreBreakdown } from './types'

export const calculateMoveScore = (
  placedCellsCount: number,
  clearedLineCount: number,
  comboStreak: number,
): ScoreBreakdown => {
  const placementPoints = placedCellsCount
  const clearPoints = clearedLineCount * CONFIG.clearLinePoints
  const multiClearBonusPoints =
    clearedLineCount > 1 ? (clearedLineCount - 1) * CONFIG.multiClearBonusPoints : 0
  const comboPoints =
    clearedLineCount > 0 && comboStreak > 1 ? (comboStreak - 1) * CONFIG.comboStreakBonusPoints : 0
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
