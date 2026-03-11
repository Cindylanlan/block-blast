import type { RewardGrant, RewardSource, ToolType } from '../game/types'

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

export const showRewardedAd = async (tool: ToolType): Promise<RewardGrant> => {
  await wait(900)

  return {
    tool,
    amount: 1,
    source: 'rewarded-ad',
  }
}

export const purchasePack = async (
  tool: ToolType,
  source: RewardSource = 'shop-pack',
): Promise<RewardGrant> => {
  await wait(650)

  return {
    tool,
    amount: tool === 'reroll' ? 2 : 3,
    source,
  }
}

export const showReviveAd = async () => {
  await wait(1100)
}

export const purchaseRevive = async () => {
  await wait(800)
}
