import { useEffect, useRef, useState } from 'react'

import type { CellOffset, ClearedBlockSnapshot, GameEvent, PieceColor } from '../game/types'
import { debugProfiler } from '../utils/debugProfiler'

const DEBUG = import.meta.env.DEV

/** 碎裂粒子：每个被消除格子拆成的多块小粒子，散射后下落 */
export interface ClearParticle {
  id: number
  left: number
  top: number
  color: PieceColor
  size: number
  offsetX: number
  offsetY: number
  fallY: number
  delay: number
  duration: number
  opacity: number
}

export interface FloatingScore {
  id: number
  amount: number
  label: string | null
  left: number
  top: number
  travelX: number
  travelY: number
}

interface UseGameFxArgs {
  eventSequence: number
  recentEvents: GameEvent[]
  boardCellSize: number
  boardGap: number
  stageRect: DOMRect | null
  boardRect: DOMRect | null
  boardPaddingLeft: number
  boardPaddingTop: number
  scoreRect: DOMRect | null
}

export interface ComboAnchor {
  left: number
  top: number
}

interface UseGameFxResult {
  comboText: string | null
  comboAnchor: ComboAnchor | null
  floatingScores: FloatingScore[]
  clearParticles: ClearParticle[]
}

const averageCells = (cells: CellOffset[]) => {
  const total = cells.reduce(
    (accumulator, cell) => ({
      row: accumulator.row + cell.row,
      col: accumulator.col + cell.col,
    }),
    { row: 0, col: 0 },
  )

  return {
    row: total.row / cells.length,
    col: total.col / cells.length,
  }
}

const getAnchorCell = (cells: CellOffset[]) => {
  const average = averageCells(cells)

  return cells.reduce((closest, cell) => {
    const currentDistance = Math.hypot(cell.row - average.row, cell.col - average.col)
    const closestDistance = Math.hypot(closest.row - average.row, closest.col - average.col)

    return currentDistance < closestDistance ? cell : closest
  })
}

/** Combo banner text: "Combo N" where N = simultaneous lines cleared */
const getComboText = (clearedLineCount: number) => `Combo ${clearedLineCount}`

const getParticlesPerCell = () =>
  typeof window !== 'undefined' && 'ontouchstart' in window ? 2 : 3
const MAX_PARTICLES = 36
const PARTICLE_SIZE_RATIO = 0.32
const SCATTER_DISTANCE_RATIO = 0.42
const FALL_Y_BASE = 100
const FALL_Y_VARIANCE = 30
const STAGE_PADDING_LEFT = 16
const STAGE_PADDING_TOP = 18

const toStageX = (viewportX: number, stageRect: DOMRect) =>
  viewportX - stageRect.left - STAGE_PADDING_LEFT
const toStageY = (viewportY: number, stageRect: DOMRect) =>
  viewportY - stageRect.top - STAGE_PADDING_TOP

const createScatterParticles = (
  clearedBlocks: ClearedBlockSnapshot[],
  rowsCleared: number[],
  colsCleared: number[],
  baseId: number,
  pitch: number,
  boardRect: DOMRect,
  stageRect: DOMRect,
  boardPaddingLeft: number,
  boardPaddingTop: number,
  boardCellSize: number,
): ClearParticle[] => {
  const out: ClearParticle[] = []
  let idx = 0
  const scatterDist = Math.max(120, stageRect.width * SCATTER_DISTANCE_RATIO)
  const isRowClear = rowsCleared.length > 0
  const isColClear = colsCleared.length > 0
  const particlesPerCell = getParticlesPerCell()

  for (const block of clearedBlocks) {
    const centerX =
      toStageX(boardRect.left, stageRect) +
      boardPaddingLeft +
      block.col * pitch +
      boardCellSize / 2
    const centerY =
      toStageY(boardRect.top, stageRect) +
      boardPaddingTop +
      block.row * pitch +
      boardCellSize / 2
    const size = Math.max(6, boardCellSize * PARTICLE_SIZE_RATIO)

    for (let i = 0; i < particlesPerCell; i += 1) {
      let angle: number
      if (isRowClear && !isColClear) {
        const base = Math.PI / 2 + (i / particlesPerCell) * Math.PI * 0.7 + (block.col * 0.2)
        angle = base
      } else if (isColClear && !isRowClear) {
        const base = (i / particlesPerCell) * Math.PI * 0.7 + (block.row * 0.2)
        angle = base
      } else {
        const base = (i / particlesPerCell) * Math.PI * 2 + (block.row + block.col) * 0.5
        angle = base
      }
      const dist = scatterDist * (0.7 + (i % 4) * 0.1)
      let offsetX = Math.cos(angle) * dist
      let offsetY = Math.sin(angle) * dist
      if (offsetY < 0) {
        offsetY *= 0.3
      }
      offsetY += scatterDist * 0.15
      const fallY =
        FALL_Y_BASE + ((block.row + block.col + i) % 5) * (FALL_Y_VARIANCE / 4)
      out.push({
        id: baseId * 1000 + idx,
        left: centerX,
        top: centerY,
        color: block.color,
        size,
        offsetX,
        offsetY,
        fallY,
        delay: (block.row + block.col + i) * 10,
        duration: 1000 + (i % 4) * 50,
        opacity: 0.92 - (i % 4) * 0.06,
      })
      idx += 1
      if (out.length >= MAX_PARTICLES) break
    }
    if (out.length >= MAX_PARTICLES) break
  }

  if (DEBUG && out.length > 0) {
    const first = out[0]
    const firstBlock = clearedBlocks[0]
    console.debug('[clearFx] particles', {
      clearedBlocksCount: clearedBlocks.length,
      particlesCount: out.length,
      rowsCleared: rowsCleared.length,
      colsCleared: colsCleared.length,
      firstBlock: firstBlock ? { row: firstBlock.row, col: firstBlock.col } : null,
      firstParticle: { left: first.left, top: first.top, offsetX: first.offsetX, offsetY: first.offsetY },
      boardRect: { left: boardRect.left, top: boardRect.top },
      stageRect: { left: stageRect.left, top: stageRect.top },
    })
  }

  return out
}

export const useGameFx = ({
  eventSequence,
  recentEvents,
  boardCellSize,
  boardGap,
  stageRect,
  boardRect,
  boardPaddingLeft,
  boardPaddingTop,
  scoreRect,
}: UseGameFxArgs): UseGameFxResult => {
  const [comboText, setComboText] = useState<string | null>(null)
  const [comboAnchor, setComboAnchor] = useState<ComboAnchor | null>(null)
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([])
  const [clearParticles, setClearParticles] = useState<ClearParticle[]>([])
  const lastHandledComboIdRef = useRef<number | null>(null)
  const lastHandledScoreIdRef = useRef<number | null>(null)
  const pendingTimersRef = useRef<number[]>([])

  useEffect(
    () => () => {
      pendingTimersRef.current.forEach((id) => window.clearTimeout(id))
      pendingTimersRef.current = []
    },
    [],
  )

  useEffect(() => {
    if (!recentEvents.length || !boardRect || !stageRect) {
      return undefined
    }

    const comboEvent = recentEvents.find((event) => event.type === 'comboAdvanced')
    const linesEvent = recentEvents.find((event) => event.type === 'linesCleared')
    const piecePlacedEvent = recentEvents.find((event) => event.type === 'piecePlaced')

    if (
      comboEvent &&
      comboEvent.type === 'comboAdvanced' &&
      comboEvent.id !== lastHandledComboIdRef.current
    ) {
      lastHandledComboIdRef.current = comboEvent.id
      const text = getComboText(comboEvent.clearedLineCount)
      const anchorCells =
        piecePlacedEvent?.type === 'piecePlaced' && piecePlacedEvent.placedCells.length
          ? piecePlacedEvent.placedCells
          : linesEvent?.type === 'linesCleared' && linesEvent.clearedCells.length
            ? linesEvent.clearedCells
            : []
      const anchor: ComboAnchor | null =
        anchorCells.length > 0
          ? (() => {
              const pitch = boardCellSize + boardGap
              const anchorCell = getAnchorCell(anchorCells)
              return {
                left:
                  toStageX(boardRect.left, stageRect) +
                  boardPaddingLeft +
                  anchorCell.col * pitch +
                  boardCellSize / 2,
                top:
                  toStageY(boardRect.top, stageRect) +
                  boardPaddingTop +
                  anchorCell.row * pitch +
                  boardCellSize / 2,
              }
            })()
          : null

      const showTimer = window.setTimeout(() => {
        setComboText(text)
        setComboAnchor(anchor)
      }, 0)
      const hideTimer = window.setTimeout(() => {
        setComboText(null)
        setComboAnchor(null)
      }, 2400)

      return () => {
        window.clearTimeout(showTimer)
        window.clearTimeout(hideTimer)
      }
    }

    return undefined
  }, [
    eventSequence,
    recentEvents,
    boardRect,
    stageRect,
    boardCellSize,
    boardGap,
    boardPaddingLeft,
    boardPaddingTop,
  ])

  useEffect(() => {
    if (!recentEvents.length || !boardRect || !scoreRect || !stageRect) {
      return undefined
    }

    const scoreEvent = recentEvents.find((event) => event.type === 'score')

    if (!scoreEvent || scoreEvent.type !== 'score' || scoreEvent.id === lastHandledScoreIdRef.current) {
      return undefined
    }

    lastHandledScoreIdRef.current = scoreEvent.id

    if (scoreEvent.breakdown.clearedLineCount <= 0) {
      return undefined
    }

    const linesEvent = recentEvents.find((event) => event.type === 'linesCleared')
    const piecePlacedEvent = recentEvents.find((event) => event.type === 'piecePlaced')
    const floatingId = scoreEvent.id
    const sourceCells =
      piecePlacedEvent?.type === 'piecePlaced' && piecePlacedEvent.placedCells.length
        ? piecePlacedEvent.placedCells
        : linesEvent?.type === 'linesCleared' && linesEvent.clearedCells.length
          ? linesEvent.clearedCells
          : scoreEvent.sourceCells
    const anchorCell = getAnchorCell(sourceCells)
    const pitch = boardCellSize + boardGap
    const startX =
      toStageX(boardRect.left, stageRect) +
      boardPaddingLeft +
      anchorCell.col * pitch +
      boardCellSize / 2
    const startY =
      toStageY(boardRect.top, stageRect) +
      boardPaddingTop +
      anchorCell.row * pitch +
      boardCellSize / 2
    const targetX = toStageX(scoreRect.left, stageRect) + scoreRect.width / 2
    const targetY = toStageY(scoreRect.top, stageRect) + scoreRect.height / 2

    if (DEBUG) {
      const piecePlacedFound = !!piecePlacedEvent?.type && piecePlacedEvent.type === 'piecePlaced'
      console.debug('[clearFx] score', {
        sourceCells: sourceCells.length,
        anchorCell: { row: anchorCell.row, col: anchorCell.col },
        startX,
        startY,
        targetX,
        targetY,
        piecePlacedFound,
      })
    }

    const comboEvent = recentEvents.find((event) => event.type === 'comboAdvanced')
    const scoreDelayMs = comboEvent ? 450 : 0

    const addScoreTimer = window.setTimeout(() => {
      setFloatingScores((current) => [
        ...current,
        {
          id: floatingId,
          amount: scoreEvent.amount,
          label: scoreEvent.breakdown.label,
          left: startX,
          top: startY,
          travelX: targetX - startX,
          travelY: targetY - startY,
        },
      ])
    }, scoreDelayMs)
    const removeScoreTimer = window.setTimeout(() => {
      setFloatingScores((current) => current.filter((item) => item.id !== floatingId))
    }, scoreDelayMs + 2400)

    pendingTimersRef.current.push(addScoreTimer, removeScoreTimer)

    if (!sourceCells.length || !linesEvent || linesEvent.type !== 'linesCleared') {
      return undefined
    }

    const t0 = debugProfiler.isEnabled() ? performance.now() : 0
    const particles = createScatterParticles(
      linesEvent.clearedBlocks,
      linesEvent.rows,
      linesEvent.cols,
      floatingId,
      pitch,
      boardRect,
      stageRect,
      boardPaddingLeft,
      boardPaddingTop,
      boardCellSize,
    )
    if (debugProfiler.isEnabled()) {
      const d = Math.round((performance.now() - t0) * 100) / 100
      debugProfiler.log('gameFxEffect', { particleCount: particles.length }, d)
    }

    const addBlockTimer = window.setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setClearParticles((current) => [...current, ...particles])
        })
      })
    }, 0)
    const removeBlockTimer = window.setTimeout(() => {
      setClearParticles((current) =>
        current.filter((p) => !particles.some((item) => item.id === p.id)),
      )
    }, 1600)

    pendingTimersRef.current.push(addBlockTimer, removeBlockTimer)

    return undefined
  }, [
    boardCellSize,
    boardGap,
    boardPaddingLeft,
    boardPaddingTop,
    stageRect,
    boardRect,
    eventSequence,
    recentEvents,
    scoreRect,
  ])

  return {
    comboText,
    comboAnchor,
    floatingScores,
    clearParticles,
  }
}
