import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

import { hasAnyPlacement, placePiece } from '../game/board'
import { findPlacementPreview } from '../game/placement'
import { BOARD_SIZE } from '../game/types'
import type {
  BoardMatrix,
  PieceDefinition,
  PlacementPosition,
  PlacementPreview,
  TrayPiece,
} from '../game/types'
import type { BoardMetrics } from './useBoardMetrics'

export interface DragState {
  slotId: string
  piece: PieceDefinition
  clientX: number
  clientY: number
  anchorX: number
  anchorY: number
  preview: PlacementPreview | null
}

interface UsePieceDragArgs {
  board: BoardMatrix
  tray: TrayPiece[]
  boardMetricsRef: React.MutableRefObject<BoardMetrics>
  boardRef: React.RefObject<HTMLDivElement | null>
  gameOver: boolean
  selectedTool: string | null
  onPlace: (slotId: string, position: PlacementPosition) => void
  onUnlockAudio: () => void
  onWarmUpSpeech: () => void
  onPlayDragWhoosh: () => void
  getBoardMetrics: (el: HTMLDivElement | null) => BoardMetrics
  refreshBoardMetrics: () => void
}

export function usePieceDrag({
  board,
  tray,
  boardMetricsRef,
  boardRef,
  gameOver,
  selectedTool,
  onPlace,
  onUnlockAudio,
  onWarmUpSpeech,
  onPlayDragWhoosh,
  getBoardMetrics,
  refreshBoardMetrics,
}: UsePieceDragArgs) {
  const [dragState, setDragState] = useState<DragState | null>(null)
  const dragStateRef = useRef<DragState | null>(null)
  const dragFrameRef = useRef<number | null>(null)
  const getPreviewRef = useRef<
    (
      piece: PieceDefinition,
      clientX: number,
      clientY: number,
      anchorX: number,
      anchorY: number,
      metrics?: BoardMetrics,
    ) => PlacementPreview | null
  >(() => null)

  const getPreview = useCallback(
    (
      piece: PieceDefinition,
      clientX: number,
      clientY: number,
      anchorX: number,
      anchorY: number,
      metrics: BoardMetrics = boardMetricsRef.current,
    ): PlacementPreview | null => {
      const rect = metrics.rect
      if (!rect) return null
      const floatRow = (clientY - rect.top - metrics.paddingTop) / metrics.pitch - anchorY
      const floatCol = (clientX - rect.left - metrics.paddingLeft) / metrics.pitch - anchorX
      return findPlacementPreview(board, piece, floatRow, floatCol)
    },
    [board, boardMetricsRef],
  )
  getPreviewRef.current = getPreview

  const getBoardCellFromPointer = useCallback((clientX: number, clientY: number) => {
    const metrics = boardMetricsRef.current
    const rect = metrics.rect
    if (!rect) return null
    const row = Math.floor((clientY - rect.top - metrics.paddingTop) / metrics.pitch)
    const col = Math.floor((clientX - rect.left - metrics.paddingLeft) / metrics.pitch)
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return null
    return { row, col }
  }, [boardMetricsRef])

  useEffect(() => {
    dragStateRef.current = dragState
  }, [dragState])

  useEffect(() => {
    if (!dragStateRef.current) return undefined

    const handlePointerMove = (event: PointerEvent) => {
      event.preventDefault()
      const nextX = event.clientX
      const nextY = event.clientY
      if (dragFrameRef.current !== null) window.cancelAnimationFrame(dragFrameRef.current)
      dragFrameRef.current = window.requestAnimationFrame(() => {
        const current = dragStateRef.current
        if (!current) return
        const preview = getPreviewRef.current(
          current.piece,
          nextX,
          nextY,
          current.anchorX,
          current.anchorY,
        )
        setDragState((previous) =>
          previous
            ? { ...previous, clientX: nextX, clientY: nextY, preview: preview ?? previous.preview }
            : null,
        )
      })
    }

    const handlePointerUp = () => {
      if (dragFrameRef.current !== null) {
        window.cancelAnimationFrame(dragFrameRef.current)
        dragFrameRef.current = null
      }
      const current = dragStateRef.current
      onUnlockAudio()
      onWarmUpSpeech()
      if (current?.preview?.valid) {
        onPlace(current.slotId, { row: current.preview.row, col: current.preview.col })
      }
      setDragState(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
    return () => {
      if (dragFrameRef.current) window.cancelAnimationFrame(dragFrameRef.current)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [!!dragState, onPlace, onUnlockAudio, onWarmUpSpeech])

  const handlePiecePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, slot: TrayPiece) => {
      if (gameOver || slot.used || (!!selectedTool && selectedTool !== 'reroll')) return
      onUnlockAudio()
      onPlayDragWhoosh()
      event.preventDefault()
      refreshBoardMetrics()
      const nextMetrics = getBoardMetrics(boardRef.current)
      boardMetricsRef.current = nextMetrics
      const shapeElement = event.currentTarget.querySelector('.tray-piece__shape')
      const rect =
        shapeElement?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect()
      const pieceCellWidth = rect.width / slot.piece.width
      const pieceCellHeight = rect.height / slot.piece.height
      const isTouch = event.pointerType === 'touch'
      const anchorX = isTouch ? slot.piece.width / 2 : (event.clientX - rect.left) / pieceCellWidth
      const anchorY = isTouch ? slot.piece.height + 1.5 : (event.clientY - rect.top) / pieceCellHeight

      setDragState({
        slotId: slot.slotId,
        piece: slot.piece,
        clientX: event.clientX,
        clientY: event.clientY,
        anchorX,
        anchorY,
        preview: getPreview(slot.piece, event.clientX, event.clientY, anchorX, anchorY, nextMetrics),
      })
    },
    [
      gameOver,
      selectedTool,
      onUnlockAudio,
      onPlayDragWhoosh,
      onWarmUpSpeech,
      refreshBoardMetrics,
      getBoardMetrics,
      boardRef,
      boardMetricsRef,
      getPreview,
    ],
  )

  const blockedSlotIds = useMemo(
    () =>
      new Set(
        tray.filter((slot) => !slot.used && !hasAnyPlacement(board, slot.piece)).map((s) => s.slotId),
      ),
    [board, tray],
  )

  const warningSlotIds = useMemo(() => {
    if (!dragState?.preview?.valid || !dragState.preview.snapped) return new Set<string>()
    const activeSlot = tray.find((s) => s.slotId === dragState.slotId)
    if (!activeSlot || activeSlot.used) return new Set<string>()
    const nextBoard = placePiece(board, activeSlot.piece, dragState.preview.row, dragState.preview.col).board
    const nextTray = tray.map((slot) =>
      slot.slotId === dragState.slotId ? { ...slot, used: true } : slot,
    )
    if (nextTray.every((s) => s.used)) return new Set<string>()
    return new Set(
      nextTray
        .filter((slot) => !slot.used && !hasAnyPlacement(nextBoard, slot.piece))
        .map((s) => s.slotId),
    )
  }, [dragState, board, tray])

  return {
    dragState,
    setDragState,
    handlePiecePointerDown,
    getBoardCellFromPointer,
    getPreview,
    blockedSlotIds,
    warningSlotIds,
  }
}
