/**
 * 消除时触觉反馈
 * - Android: Web Vibration API
 * - iOS 17.4+: web-haptics 通过 switch 控件触发
 */
import { WebHaptics } from 'web-haptics'

let haptics: WebHaptics | null = null

function getHaptics(): WebHaptics | null {
  if (typeof window === 'undefined') return null
  if (!haptics) haptics = new WebHaptics()
  return haptics
}

export function vibrateOnClear(lineCount: number): void {
  const h = getHaptics()
  if (!h) return
  try {
    if (lineCount >= 3) {
      h.trigger('error')
    } else if (lineCount === 2) {
      h.trigger('nudge')
    } else {
      h.trigger('success')
    }
  } catch {
    if ('vibrate' in navigator) {
      if (lineCount >= 3) navigator.vibrate([40, 30, 50, 30, 60])
      else if (lineCount === 2) navigator.vibrate([30, 20, 40])
      else navigator.vibrate(30)
    }
  }
}
