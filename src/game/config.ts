/**
 * 游戏规则配置中心：棋盘、计分、工具、放置等常数
 * 调参或做多难度时只需修改此文件
 */
export const CONFIG = {
  boardSize: 8,
  traySize: 3,
  clearLinePoints: 18,
  multiClearBonusPoints: 12,
  comboStreakBonusPoints: 16,
  snapRadius: 1.65,
  initialTools: { reroll: 2, bomb: 2, hammer: 3 } as const,
  failBannerCountdownInitial: 10,
  failBannerDurationMs: 10000,
  failBannerBannerDelayMs: 900,
} as const
