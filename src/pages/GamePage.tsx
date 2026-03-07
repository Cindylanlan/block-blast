import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'

import { Board } from '../components/Board'
import { GameHud } from '../components/GameHud'
import { GameOverModal } from '../components/GameOverModal'
import { PieceTray } from '../components/PieceTray'
import { canPlacePiece, getAbsoluteCells } from '../game/board'
import { createInitialGameState, placeTrayPiece } from '../game/gameState'
import { BOARD_SIZE } from '../game/types'
import type { PieceDefinition, PlacementPreview, TrayPiece } from '../game/types'

interface GamePageProps {
  bestScore: number
  onBestScoreChange: (score: number) => void
  onBackToMenu: () => void
}

interface DragState {
  slotId: string
  piece: PieceDefinition
  clientX: number
  clientY: number
  anchorX: number
  anchorY: number
  preview: PlacementPreview | null
}

interface BoardMetrics {
  cellSize: number
  gap: number
  pitch: number
}

const getBoardMetrics = (element: HTMLDivElement | null): BoardMetrics => {
  if (!element) {
    return {
      cellSize: 40,
      gap: 6,
      pitch: 46,
    }
  }

  const rect = element.getBoundingClientRect()
  const styles = window.getComputedStyle(element)
  const gap = Number.parseFloat(styles.columnGap || '0') || 0
  const paddingLeft = Number.parseFloat(styles.paddingLeft || '0') || 0
  const paddingRight = Number.parseFloat(styles.paddingRight || '0') || 0
  const cellSize =
    (rect.width - paddingLeft - paddingRight - gap * (BOARD_SIZE - 1)) / BOARD_SIZE

  return {
    cellSize,
    gap,
    pitch: cellSize + gap,
  }
}

export function GamePage({ bestScore, onBestScoreChange, onBackToMenu }: GamePageProps) {
  const [gameState, setGameState] = useState(createInitialGameState)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [boardMetrics, setBoardMetrics] = useState<BoardMetrics>(() => getBoardMetrics(null))
  const boardRef = useRef<HTMLDivElement>(null)

  const refreshBoardMetrics = () => {
    setBoardMetrics(getBoardMetrics(boardRef.current))
  }

  useEffect(() => {
    refreshBoardMetrics()
    window.addEventListener('resize', refreshBoardMetrics)

    return () => window.removeEventListener('resize', refreshBoardMetrics)
  }, [])

  useEffect(() => {
    if (gameState.score > bestScore) {
      onBestScoreChange(gameState.score)
    }
  }, [bestScore, gameState.score, onBestScoreChange])

  const getPreview = useCallback((
    piece: PieceDefinition,
    clientX: number,
    clientY: number,
    anchorX: number,
    anchorY: number,
  ): PlacementPreview | null => {
    const boardElement = boardRef.current

    if (!boardElement) {
      return null
    }

    const rect = boardElement.getBoundingClientRect()
    const styles = window.getComputedStyle(boardElement)
    const paddingLeft = Number.parseFloat(styles.paddingLeft || '0') || 0
    const paddingTop = Number.parseFloat(styles.paddingTop || '0') || 0
    const metrics = getBoardMetrics(boardElement)
    const row = Math.floor((clientY - rect.top - paddingTop) / metrics.pitch - anchorY)
    const col = Math.floor((clientX - rect.left - paddingLeft) / metrics.pitch - anchorX)
    const cells = getAbsoluteCells(piece, row, col)

    return {
      row,
      col,
      cells,
      valid: canPlacePiece(gameState.board, piece, row, col),
    }
  }, [gameState.board])

  useEffect(() => {
    if (!dragState) {
      return undefined
    }

    const handlePointerMove = (event: PointerEvent) => {
      event.preventDefault()
      const preview = getPreview(
        dragState.piece,
        event.clientX,
        event.clientY,
        dragState.anchorX,
        dragState.anchorY,
      )

      setDragState((current) =>
        current
          ? {
              ...current,
              clientX: event.clientX,
              clientY: event.clientY,
              preview,
            }
          : null,
      )
    }

    const handlePointerUp = () => {
      if (dragState?.preview?.valid) {
        setGameState((previous) =>
          placeTrayPiece(previous, dragState.slotId, {
            row: dragState.preview!.row,
            col: dragState.preview!.col,
          }),
        )
      }

      setDragState(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [dragState, getPreview])

  const handlePiecePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    slot: TrayPiece,
  ) => {
    if (gameState.status === 'game-over' || slot.used) {
      return
    }

    event.preventDefault()
    refreshBoardMetrics()

    const shapeElement = event.currentTarget.querySelector('.tray-piece__shape')
    const rect = shapeElement?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect()
    const pieceCellWidth = rect.width / slot.piece.width
    const pieceCellHeight = rect.height / slot.piece.height
    const anchorX = (event.clientX - rect.left) / pieceCellWidth
    const anchorY = (event.clientY - rect.top) / pieceCellHeight

    setDragState({
      slotId: slot.slotId,
      piece: slot.piece,
      clientX: event.clientX,
      clientY: event.clientY,
      anchorX,
      anchorY,
      preview: getPreview(slot.piece, event.clientX, event.clientY, anchorX, anchorY),
    })
  }

  const restartGame = () => {
    setDragState(null)
    setGameState(createInitialGameState())
  }

  const preview = dragState?.preview ?? null

  const dragOverlayStyle = useMemo(() => {
    if (!dragState) {
      return undefined
    }

    return {
      width: `${dragState.piece.width * boardMetrics.cellSize + (dragState.piece.width - 1) * boardMetrics.gap}px`,
      height: `${dragState.piece.height * boardMetrics.cellSize + (dragState.piece.height - 1) * boardMetrics.gap}px`,
      left: `${dragState.clientX - dragState.anchorX * boardMetrics.pitch}px`,
      top: `${dragState.clientY - dragState.anchorY * boardMetrics.pitch}px`,
      gap: `${boardMetrics.gap}px`,
      '--drag-cols': dragState.piece.width,
      '--drag-rows': dragState.piece.height,
    } as CSSProperties
  }, [boardMetrics, dragState])

  return (
    <main className="game-page">
      <GameHud
        score={gameState.score}
        bestScore={Math.max(bestScore, gameState.score)}
        onRestart={restartGame}
        onBack={onBackToMenu}
      />

      <section className="game-stage">
        <div className="game-stage__header">
          <div>
            <p className="game-stage__eyebrow">Turn {gameState.turn}</p>
            <h2>Fill, clear, survive</h2>
          </div>
          <span className="game-stage__hint">Use all 3 blocks to refresh the tray</span>
        </div>

        <Board
          board={gameState.board}
          preview={preview}
          clearedRows={gameState.lastClearedRows}
          clearedCols={gameState.lastClearedCols}
          boardRef={boardRef}
        />

        <PieceTray
          tray={gameState.tray}
          activeSlotId={dragState?.slotId ?? null}
          disabled={gameState.status === 'game-over'}
          onPiecePointerDown={handlePiecePointerDown}
        />
      </section>

      {dragState && dragOverlayStyle ? (
        <div
          className={[
            'drag-piece',
            dragState.preview?.valid ? 'drag-piece--valid' : 'drag-piece--invalid',
          ].join(' ')}
          style={dragOverlayStyle}
        >
          {dragState.piece.cells.map((cell, index) => (
            <div
              key={`${dragState.piece.id}-${index}`}
              className={`drag-piece__cell drag-piece__cell--${dragState.piece.color}`}
              style={{
                gridColumnStart: cell.col + 1,
                gridRowStart: cell.row + 1,
              }}
            />
          ))}
        </div>
      ) : null}

      <GameOverModal
        open={gameState.status === 'game-over'}
        score={gameState.score}
        bestScore={Math.max(bestScore, gameState.score)}
        onRestart={restartGame}
        onExit={onBackToMenu}
      />
    </main>
  )
}
