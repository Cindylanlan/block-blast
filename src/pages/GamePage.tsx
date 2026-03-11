import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'

import { Board } from '../components/Board'
import { ComboBanner } from '../components/ComboBanner'
import { GameHud } from '../components/GameHud'
import { GameOverModal } from '../components/GameOverModal'
import { SettingsPanel } from '../components/SettingsPanel'
import { ClearParticleFx } from '../components/ClearParticleFx'
import { MonetizationPanel } from '../components/MonetizationPanel'
import { PieceTray } from '../components/PieceTray'
import { RevivePanel } from '../components/RevivePanel'
import { ScoreBurst } from '../components/ScoreBurst'
import { ToolBar } from '../components/ToolBar'
import { hasAnyPlacement, placePiece } from '../game/board'
import { applyGameAction, createInitialGameState } from '../game/gameState'
import { findPlacementPreview } from '../game/placement'
import { getBombCells, getHammerCells } from '../game/tools'
import { BOARD_SIZE } from '../game/types'
import { useGameAudio } from '../hooks/useGameAudio'
import { useGameFx } from '../hooks/useGameFx'
import { purchasePack, purchaseRevive, showReviveAd, showRewardedAd } from '../services/monetization'
import { speakCombo, warmUpSpeech } from '../services/speechCombo'
import { debugProfiler } from '../utils/debugProfiler'
import type {
  CellOffset,
  PieceDefinition,
  PlacementPosition,
  PlacementPreview,
  ToolType,
  TrayPiece,
} from '../game/types'

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
  paddingLeft: number
  paddingTop: number
  rect: DOMRect | null
}

type GameOverPhase = 'none' | 'banner' | 'countdown' | 'summary'

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

const getToolPreviewCells = (
  tool: ToolType | null,
  board: ReturnType<typeof createInitialGameState>['board'],
  position: PlacementPosition | null,
): CellOffset[] => {
  if (!tool || !position) {
    return []
  }

  if (tool === 'hammer') {
    return getHammerCells(board, position)
  }

  if (tool === 'bomb') {
    return getBombCells(board, position)
  }

  return []
}

export function GamePage({ bestScore, onBestScoreChange, onBackToMenu }: GamePageProps) {
  const [gameState, setGameState] = useState(createInitialGameState)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [boardMetrics, setBoardMetrics] = useState<BoardMetrics>(() => getBoardMetrics(null))
  const [selectedTool, setSelectedTool] = useState<ToolType | null>(null)
  const [hoveredBoardCell, setHoveredBoardCell] = useState<PlacementPosition | null>(null)
  const [pendingTool, setPendingTool] = useState<ToolType | null>(null)
  const [shopOpen, setShopOpen] = useState(false)
  const [rewardLoading, setRewardLoading] = useState(false)
  const [reviveLoading, setReviveLoading] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [failBannerCountdown, setFailBannerCountdown] = useState(10)
  const [failBannerRemainingRatio, setFailBannerRemainingRatio] = useState(1)
  const [gameOverPhase, setGameOverPhase] = useState<GameOverPhase>('none')
  const [showReviveOptions, setShowReviveOptions] = useState(false)
  const stageRef = useRef<HTMLElement>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const scoreCardRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef<DragState | null>(null)
  const boardMetricsRef = useRef<BoardMetrics>(boardMetrics)
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

  const refreshBoardMetrics = useCallback(() => {
    if (debugProfiler.isEnabled()) debugProfiler.mark('resizeStart')
    const nextMetrics = getBoardMetrics(boardRef.current)
    boardMetricsRef.current = nextMetrics
    setBoardMetrics(nextMetrics)
    if (debugProfiler.isEnabled()) debugProfiler.measure('resize', 'resizeStart')
  }, [])

  const debouncedRefreshRef = useRef<number | null>(null)

  useEffect(() => {
    if (debugProfiler.isEnabled()) debugProfiler.startSession()
  }, [])

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
    if (gameState.score > bestScore) {
      onBestScoreChange(gameState.score)
    }
  }, [bestScore, gameState.score, onBestScoreChange])

  useEffect(() => {
    if (gameState.status !== 'game-over') {
      setFailBannerCountdown(10)
      setFailBannerRemainingRatio(1)
      setGameOverPhase('none')
      setReviveLoading(false)
      setShowReviveOptions(false)
      return undefined
    }

    setFailBannerCountdown(10)
    setFailBannerRemainingRatio(1)
    setGameOverPhase('banner')
    setShowReviveOptions(false)
  }, [gameState.status])

  useEffect(() => {
    if (gameState.status !== 'game-over' || gameOverPhase !== 'banner') {
      return undefined
    }

    const bannerTimer = window.setTimeout(() => {
      setGameOverPhase('countdown')
    }, 900)

    return () => window.clearTimeout(bannerTimer)
  }, [gameOverPhase, gameState.status])

  useEffect(() => {
    if (gameState.status !== 'game-over' || gameOverPhase !== 'countdown') {
      setFailBannerCountdown(10)
      setFailBannerRemainingRatio(1)
      return undefined
    }

    if (reviveLoading || showReviveOptions) {
      return undefined
    }

    const startedAt = window.performance.now()
    const durationMs = 10000
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, durationMs - (window.performance.now() - startedAt))
      const nextCountdown = Math.max(0, Math.ceil(remaining / 1000))
      setFailBannerCountdown(nextCountdown)
      setFailBannerRemainingRatio(remaining / durationMs)

      if (remaining <= 0) {
        window.clearInterval(timer)
        setGameOverPhase('summary')
      }
    }, 80)

    return () => window.clearInterval(timer)
  }, [gameOverPhase, gameState.status, reviveLoading, showReviveOptions])

  useEffect(() => {
    dragStateRef.current = dragState
  }, [dragState])

  useEffect(() => {
    boardMetricsRef.current = boardMetrics
  }, [boardMetrics])

  const { unlockAudio, bgmVolume, setBgmVolume, sfxVolume, setSfxVolume, playDragWhoosh } =
    useGameAudio(gameState.eventSequence, gameState.recentEvents)

  const scoreRect = scoreCardRef.current?.getBoundingClientRect() ?? null
  const stageRect = stageRef.current?.getBoundingClientRect() ?? null

  const { comboText, comboAnchor, floatingScores, clearParticles } = useGameFx({
    eventSequence: gameState.eventSequence,
    recentEvents: gameState.recentEvents,
    boardCellSize: boardMetrics.cellSize,
    boardGap: boardMetrics.gap,
    stageRect,
    boardRect: boardMetrics.rect,
    boardPaddingLeft: boardMetrics.paddingLeft,
    boardPaddingTop: boardMetrics.paddingTop,
    scoreRect,
  })

  const dispatchAction = (action: Parameters<typeof applyGameAction>[1]) => {
    if (debugProfiler.isEnabled()) debugProfiler.log('dispatchStart', { action: action.type })
    setGameState((previous) => {
      if (debugProfiler.isEnabled()) debugProfiler.mark('applyStart')
      const next = applyGameAction(previous, action)
      if (debugProfiler.isEnabled()) debugProfiler.measure('applyGameAction', 'applyStart')
      const combo = next.recentEvents.find(
        (e): e is typeof e & { type: 'comboAdvanced' } => e.type === 'comboAdvanced',
      )
      if (combo) {
        const tier: 'good' | 'great' | 'wow' =
          combo.comboStreak >= 4 || combo.clearedLineCount > 2
            ? 'wow'
            : combo.comboStreak >= 3
              ? 'great'
              : 'good'
        speakCombo(tier)
      }
      return next
    })
  }

  const openShop = (tool: ToolType) => {
    setPendingTool(tool)
    setShopOpen(true)
  }

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

      if (!rect) {
        return null
      }

      const floatRow =
        (clientY - rect.top - metrics.paddingTop) / metrics.pitch - anchorY
      const floatCol =
        (clientX - rect.left - metrics.paddingLeft) / metrics.pitch - anchorX

      return findPlacementPreview(gameState.board, piece, floatRow, floatCol)
    },
    [gameState.board],
  )
  getPreviewRef.current = getPreview

  const getBoardCellFromPointer = useCallback((clientX: number, clientY: number) => {
    const metrics = boardMetricsRef.current
    const rect = metrics.rect

    if (!rect) {
      return null
    }

    const row = Math.floor((clientY - rect.top - metrics.paddingTop) / metrics.pitch)
    const col = Math.floor((clientX - rect.left - metrics.paddingLeft) / metrics.pitch)

    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
      return null
    }

    return { row, col }
  }, [])

  useEffect(() => {
    if (!dragStateRef.current) {
      return undefined
    }

    const handlePointerMove = (event: PointerEvent) => {
      event.preventDefault()
      const nextX = event.clientX
      const nextY = event.clientY

      if (dragFrameRef.current !== null) {
        window.cancelAnimationFrame(dragFrameRef.current)
      }

      dragFrameRef.current = window.requestAnimationFrame(() => {
        const current = dragStateRef.current

        if (!current) {
          return
        }

        const t0 = debugProfiler.isEnabled() ? performance.now() : 0
        const preview = getPreviewRef.current(
          current.piece,
          nextX,
          nextY,
          current.anchorX,
          current.anchorY,
        )
        if (debugProfiler.isEnabled()) debugProfiler.logPointerMove(Math.round((performance.now() - t0) * 100) / 100)

        setDragState((previous) =>
          previous
            ? {
                ...previous,
                clientX: nextX,
                clientY: nextY,
                preview,
              }
            : null,
        )
      })
    }

    const handlePointerUp = () => {
      if (debugProfiler.isEnabled()) debugProfiler.log('pointerUp')
      if (dragFrameRef.current !== null) {
        window.cancelAnimationFrame(dragFrameRef.current)
        dragFrameRef.current = null
      }

      const current = dragStateRef.current
      unlockAudio()
      warmUpSpeech()

      if (current?.preview?.valid) {
        dispatchAction({
          type: 'place-piece',
          slotId: current.slotId,
          position: {
            row: current.preview.row,
            col: current.preview.col,
          },
        })
      }

      setDragState(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      if (dragFrameRef.current !== null) {
        window.cancelAnimationFrame(dragFrameRef.current)
        dragFrameRef.current = null
      }
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [!!dragState, unlockAudio])

  const handlePiecePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    slot: TrayPiece,
  ) => {
    if (
      gameState.status === 'game-over' ||
      slot.used ||
      (!!selectedTool && selectedTool !== 'reroll')
    ) {
      return
    }

    if (debugProfiler.isEnabled()) debugProfiler.log('pointerDown')
    unlockAudio()
    playDragWhoosh()
    event.preventDefault()
    const nextMetrics = getBoardMetrics(boardRef.current)
    boardMetricsRef.current = nextMetrics
    setBoardMetrics(nextMetrics)

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
  }

  const handleToolSelect = (tool: ToolType) => {
    unlockAudio()

    if (gameState.toolInventory[tool] <= 0) {
      openShop(tool)
      return
    }

    if (tool === 'reroll') {
      dispatchAction({ type: 'reroll-tray' })
      setSelectedTool(null)
      return
    }

    setSelectedTool((current) => (current === tool ? null : tool))
  }

  const applyTool = (tool: Exclude<ToolType, 'reroll'>, position: PlacementPosition) => {
    if (gameState.toolInventory[tool] <= 0) {
      openShop(tool)
      return
    }

    dispatchAction({
      type: 'use-tool',
      tool,
      position,
    })
    setSelectedTool(null)
    setHoveredBoardCell(null)
  }

  const handleBoardPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!selectedTool || selectedTool === 'reroll') return
      setHoveredBoardCell(getBoardCellFromPointer(event.clientX, event.clientY))
    },
    [selectedTool, getBoardCellFromPointer],
  )

  const applyToolRef = useRef(applyTool)
  applyToolRef.current = applyTool

  const handleBoardPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!selectedTool || selectedTool === 'reroll') return
      unlockAudio()
      warmUpSpeech()
      const cell = getBoardCellFromPointer(event.clientX, event.clientY)
      if (!cell) return
      applyToolRef.current(selectedTool, cell)
    },
    [selectedTool, unlockAudio, getBoardCellFromPointer],
  )

  const handleReward = async (mode: 'ad' | 'shop') => {
    if (!pendingTool) {
      return
    }

    setRewardLoading(true)
    const reward =
      mode === 'ad' ? await showRewardedAd(pendingTool) : await purchasePack(pendingTool)
    dispatchAction({ type: 'grant-reward', reward })
    setRewardLoading(false)
    setShopOpen(false)
    setPendingTool(null)
  }

  const restartGame = () => {
    setDragState(null)
    setSelectedTool(null)
    setHoveredBoardCell(null)
    setPendingTool(null)
    setShopOpen(false)
    setReviveLoading(false)
    setFailBannerCountdown(10)
    setFailBannerRemainingRatio(1)
    setGameOverPhase('none')
    setShowReviveOptions(false)
    startTransition(() => {
      setGameState(createInitialGameState())
    })
  }

  const openSummary = () => {
    setShowReviveOptions(false)
    setGameOverPhase('summary')
  }

  const handleRevive = async (mode: 'ad' | 'shop') => {
    if (reviveLoading) {
      return
    }

    setReviveLoading(true)

    try {
      if (mode === 'ad') {
        await showReviveAd()
      } else {
        await purchaseRevive()
      }

      dispatchAction({ type: 'revive-game' })
      setFailBannerCountdown(10)
      setFailBannerRemainingRatio(1)
      setGameOverPhase('none')
      setShowReviveOptions(false)
    } finally {
      setReviveLoading(false)
    }
  }

  const preview = dragState?.preview ?? null
  const blockedSlotIds = useMemo(
    () =>
      new Set(
        gameState.tray
          .filter((slot) => !slot.used && !hasAnyPlacement(gameState.board, slot.piece))
          .map((slot) => slot.slotId),
      ),
    [gameState.board, gameState.tray],
  )
  const blockedPiece = useMemo(
    () => gameState.tray.find((slot) => !slot.used && blockedSlotIds.has(slot.slotId))?.piece ?? null,
    [blockedSlotIds, gameState.tray],
  )
  const warningSlotIds = useMemo(() => {
    if (!dragState?.preview?.valid || !dragState.preview.snapped) {
      return new Set<string>()
    }

    const activeSlot = gameState.tray.find((slot) => slot.slotId === dragState.slotId)

    if (!activeSlot || activeSlot.used) {
      return new Set<string>()
    }

    const nextBoard = placePiece(
      gameState.board,
      activeSlot.piece,
      dragState.preview.row,
      dragState.preview.col,
    ).board
    const nextTray = gameState.tray.map((slot) =>
      slot.slotId === dragState.slotId
        ? {
            ...slot,
            used: true,
          }
        : slot,
    )

    if (nextTray.every((slot) => slot.used)) {
      return new Set<string>()
    }

    return new Set(
      nextTray
        .filter((slot) => !slot.used && !hasAnyPlacement(nextBoard, slot.piece))
        .map((slot) => slot.slotId),
    )
  }, [dragState, gameState.board, gameState.tray])
  const highlightedCells = useMemo(
    () => getToolPreviewCells(selectedTool, gameState.board, hoveredBoardCell),
    [gameState.board, hoveredBoardCell, selectedTool],
  )
  const failBanner =
    gameState.status === 'game-over' && gameOverPhase === 'banner' ? (
      <div className="fail-banner">
        <div className="fail-banner__copy">
          <strong>棋盘上没有放置空间了</strong>
          <span>{blockedPiece ? '当前关键块已经没有落点。' : '当前托盘已经没有任何可用落点。'}</span>
        </div>
      </div>
    ) : null
  const showCountdownPanel = gameState.status === 'game-over' && gameOverPhase === 'countdown'
  const countdownPanel = showCountdownPanel ? (
    <section className="fail-countdown-panel">
      <div
        className="fail-countdown-panel__timer"
        style={{ '--countdown-ratio': failBannerRemainingRatio } as React.CSSProperties}
      >
        {failBannerCountdown}
      </div>
      <p className="fail-countdown-panel__title">没有放置空间了</p>
      <p className="fail-countdown-panel__copy">现在可以选择复活，或者直接结束本局进入结算。</p>
      <div className="fail-countdown-panel__actions">
        <button
          type="button"
          className="primary-button"
          disabled={reviveLoading}
          onClick={() => setShowReviveOptions(true)}
        >
          {reviveLoading ? '处理中...' : '复活'}
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={reviveLoading}
          onClick={openSummary}
        >
          游戏结束
        </button>
      </div>
    </section>
  ) : null

  const dragOverlayStyle = useMemo(() => {
    if (!dragState) {
      return undefined
    }

    const x = dragState.clientX - dragState.anchorX * boardMetrics.pitch
    const y = dragState.clientY - dragState.anchorY * boardMetrics.pitch
    const scale = dragState.preview?.snapped ? 1.04 : 1.02

    return {
      width: `${dragState.piece.width * boardMetrics.cellSize + (dragState.piece.width - 1) * boardMetrics.gap}px`,
      height: `${dragState.piece.height * boardMetrics.cellSize + (dragState.piece.height - 1) * boardMetrics.gap}px`,
      left: 0,
      top: 0,
      transform: `translate(${x}px, ${y}px) scale(${scale})`,
      gap: `${boardMetrics.gap}px`,
      '--drag-cols': dragState.piece.width,
      '--drag-rows': dragState.piece.height,
    } as CSSProperties
  }, [boardMetrics, dragState])

  return (
    <main
      className={[
        'game-page',
        selectedTool ? `game-page--tool-${selectedTool}` : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <GameHud
        score={gameState.score}
        bestScore={Math.max(bestScore, gameState.score)}
        comboStreak={gameState.comboStreak}
        scoreCardRef={scoreCardRef}
        onRestart={restartGame}
        onBack={onBackToMenu}
        onSettings={() => setSettingsOpen(true)}
        scoresInHeader={false}
      />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        bgmVolume={bgmVolume}
        onBgmVolumeChange={setBgmVolume}
        sfxVolume={sfxVolume}
        onSfxVolumeChange={setSfxVolume}
      />

      <section className="game-stage" ref={stageRef}>
        <div className="game-stage__scores game-stage__scores--compact" ref={scoreCardRef}>
          <span className="game-stage__score-item game-stage__score-item--best">
            <span className="game-stage__score-label">Best</span>
            <strong>{Math.max(bestScore, gameState.score)}</strong>
          </span>
          <span className={['game-stage__score-item', 'game-stage__score-item--current', gameState.comboStreak > 1 ? 'game-stage__score-item--charged' : ''].filter(Boolean).join(' ')}>
            <span className="game-stage__score-label">Score</span>
            <strong>{gameState.score}</strong>
            {gameState.comboStreak > 1 ? <em className="game-stage__score-combo">x{gameState.comboStreak}</em> : null}
          </span>
        </div>

        <ComboBanner text={comboText} anchor={comboAnchor} />
        <ClearParticleFx particles={clearParticles} />
        <ScoreBurst floatingScores={floatingScores} />

        <div className="game-stage__board-wrap">
          <Board
            board={gameState.board}
            preview={preview}
            clearedRows={gameState.lastClearedRows}
            clearedCols={gameState.lastClearedCols}
            highlightedCells={highlightedCells}
            failBanner={failBanner}
            boardRef={boardRef}
            onBoardPointerDown={handleBoardPointerDown}
            onBoardPointerMove={handleBoardPointerMove}
          />

          {countdownPanel}
        </div>

        <div className="game-stage__bottom">
          <ToolBar
            inventory={gameState.toolInventory}
            selectedTool={selectedTool}
            onSelectTool={handleToolSelect}
            onOpenShop={() => openShop('reroll')}
          />
          <PieceTray
            tray={gameState.tray}
            activeSlotId={dragState?.slotId ?? null}
            blockedSlotIds={blockedSlotIds}
            warningSlotIds={warningSlotIds}
            disabled={
              gameState.status === 'game-over' || (!!selectedTool && selectedTool !== 'reroll')
            }
            onPiecePointerDown={handlePiecePointerDown}
            boardCellSize={boardMetrics.cellSize}
            boardGap={boardMetrics.gap}
            trayCellSize={Math.min(boardMetrics.cellSize, typeof window !== 'undefined' && window.innerWidth <= 480 ? 24 : 28)}
          />
        </div>
      </section>

      {dragState && dragOverlayStyle ? (
        <div
          className={[
            'drag-piece',
            dragState.preview?.valid ? 'drag-piece--valid' : 'drag-piece--invalid',
            dragState.preview?.snapped ? 'drag-piece--snapped' : '',
          ]
            .filter(Boolean)
            .join(' ')}
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

      <MonetizationPanel
        open={shopOpen}
        pendingTool={pendingTool}
        loading={rewardLoading}
        onWatchAd={() => void handleReward('ad')}
        onBuyPack={() => void handleReward('shop')}
        onClose={() => {
          setPendingTool(null)
          setShopOpen(false)
        }}
      />

      <GameOverModal
        open={gameState.status === 'game-over' && gameOverPhase === 'summary'}
        score={gameState.score}
        bestScore={Math.max(bestScore, gameState.score)}
        onRestart={restartGame}
        onExit={onBackToMenu}
      />

      <RevivePanel
        open={showReviveOptions}
        loading={reviveLoading}
        onWatchAd={() => void handleRevive('ad')}
        onBuyRevive={() => void handleRevive('shop')}
        onClose={() => setShowReviveOptions(false)}
      />
    </main>
  )
}
