import { useCallback, useEffect, useRef, useState } from 'react'

import { BOARD_SIZE } from '../game/types'
import { debugProfiler } from '../utils/debugProfiler'

export interface BoardMetrics {
  cellSize: number
  gap: number
  pitch: number
  paddingLeft: number
  paddingTop: number
  rect: DOMRect | null
}

const getBoardMetrics = (element: HTMLDivElement | null): BoardMetrics => {
  if (!element) {
    return {
      cellSize: 40,
      gap: 6,
      pitch: 46,
      paddingLeft: 10,
      paddingTop: 10,
      rect: null,
    }
  }

  const rect = element.getBoundingClientRect()
  const styles = window.getComputedStyle(element)
  const gap = Number.parseFloat(styles.columnGap || '0') || 0
  const paddingLeft = Number.parseFloat(styles.paddingLeft || '0') || 0
  const paddingRight = Number.parseFloat(styles.paddingRight || '0') || 0
  const paddingTop = Number.parseFloat(styles.paddingTop || '0') || 0
  const cellSize =
    (rect.width - paddingLeft - paddingRight - gap * (BOARD_SIZE - 1)) / BOARD_SIZE

  return {
    cellSize,
    gap,
    pitch: cellSize + gap,
    paddingLeft,
    paddingTop,
    rect,
  }
}

export function useBoardMetrics(boardRef: React.RefObject<HTMLDivElement | null>) {
  const [boardMetrics, setBoardMetrics] = useState<BoardMetrics>(() => getBoardMetrics(null))
  const boardMetricsRef = useRef<BoardMetrics>(boardMetrics)
  const debouncedRefreshRef = useRef<number | null>(null)

  const refreshBoardMetrics = useCallback(() => {
    if (debugProfiler.isEnabled()) debugProfiler.mark('resizeStart')
    const nextMetrics = getBoardMetrics(boardRef.current)
    boardMetricsRef.current = nextMetrics
    setBoardMetrics(nextMetrics)
    if (debugProfiler.isEnabled()) debugProfiler.measure('resize', 'resizeStart')
  }, [boardRef])

  useEffect(() => {
    refreshBoardMetrics()
    const handleResize = () => {
      if (debouncedRefreshRef.current) window.cancelAnimationFrame(debouncedRefreshRef.current)
      debouncedRefreshRef.current = window.requestAnimationFrame(() => {
        debouncedRefreshRef.current = null
        refreshBoardMetrics()
      })
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (debouncedRefreshRef.current) window.cancelAnimationFrame(debouncedRefreshRef.current)
    }
  }, [refreshBoardMetrics])

  useEffect(() => {
    boardMetricsRef.current = boardMetrics
  }, [boardMetrics])

  return { boardMetrics, boardMetricsRef, refreshBoardMetrics, getBoardMetrics }
}
