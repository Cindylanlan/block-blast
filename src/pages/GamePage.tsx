import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react'
import type { CSSProperties } from 'react'

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
import { BOARD_SIZE } from '../game/types'
import { applyGameAction, createInitialGameState } from '../game/gameState'
import { speakCombo } from '../services/speechCombo'
import { vibrateOnClear } from '../utils/vibrate'
import { purchasePack, purchaseRevive, showReviveAd, showRewardedAd } from '../services/monetization'
import { warmUpSpeech } from '../services/speechCombo'
import { debugProfiler } from '../utils/debugProfiler'
import { useBoardMetrics } from '../hooks/useBoardMetrics'
import { usePieceDrag } from '../hooks/usePieceDrag'
import { useToolSelection } from '../hooks/useToolSelection'
import { useGameOverFlow } from '../hooks/useGameOverFlow'
import { useGameAudio } from '../hooks/useGameAudio'
import { useGameFx } from '../hooks/useGameFx'
import type { ToolType } from '../game/types'

interface GamePageProps {
  bestScore: number
  onBestScoreChange: (score: number) => void
  onBackToMenu: () => void
}

export function GamePage({ bestScore, onBestScoreChange, onBackToMenu }: GamePageProps) {
  const [gameState, setGameState] = useState(createInitialGameState)
  const [pendingTool, setPendingTool] = useState<ToolType | null>(null)
  const [shopOpen, setShopOpen] = useState(false)
  const [rewardLoading, setRewardLoading] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const stageRef = useRef<HTMLElement>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const scoreCardRef = useRef<HTMLDivElement>(null)

  const { boardMetrics, boardMetricsRef, refreshBoardMetrics, getBoardMetrics } =
    useBoardMetrics(boardRef)

  const dispatchAction = useCallback(
    (action: Parameters<typeof applyGameAction>[1]) => {
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
        const linesEvent = next.recentEvents.find(
          (e): e is typeof e & { type: 'linesCleared' } => e.type === 'linesCleared',
        )
        if (linesEvent) {
          vibrateOnClear(linesEvent.lineCount)
        }
        return next
      })
    },
    [],
  )

  const openShop = useCallback((tool: ToolType) => {
    setPendingTool(tool)
    setShopOpen(true)
  }, [])

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

  const getBoardCellFromPointerForTool = useCallback((clientX: number, clientY: number) => {
    const metrics = boardMetricsRef.current
    const rect = metrics.rect
    if (!rect) return null
    const row = Math.floor((clientY - rect.top - metrics.paddingTop) / metrics.pitch)
    const col = Math.floor((clientX - rect.left - metrics.paddingLeft) / metrics.pitch)
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return null
    return { row, col }
  }, [boardMetricsRef])

  const {
    selectedTool,
    setSelectedTool,
    setHoveredBoardCell,
    handleToolSelect,
    handleBoardPointerMove,
    handleBoardPointerDown,
    highlightedCells,
  } = useToolSelection({
    board: gameState.board,
    toolInventory: gameState.toolInventory,
    onReroll: () => dispatchAction({ type: 'reroll-tray' }),
    onUseTool: (tool, position) =>
      dispatchAction({ type: 'use-tool', tool, position }),
    onOpenShop: openShop,
    onUnlockAudio: unlockAudio,
    onWarmUpSpeech: warmUpSpeech,
    getBoardCellFromPointer: getBoardCellFromPointerForTool,
  })

  const handleReviveAd = useCallback(async () => {
    await showReviveAd()
    dispatchAction({ type: 'revive-game' })
  }, [dispatchAction])

  const handleReviveShop = useCallback(async () => {
    await purchaseRevive()
    dispatchAction({ type: 'revive-game' })
  }, [dispatchAction])

  const {
    gameOverPhase,
    failBannerCountdown,
    failBannerRemainingRatio,
    showReviveOptions,
    setShowReviveOptions,
    reviveLoading,
    openSummary,
    handleRevive,
    resetForRestart,
  } = useGameOverFlow({
    gameOver: gameState.status === 'game-over',
    onReviveAd: handleReviveAd,
    onReviveShop: handleReviveShop,
  })

  const {
    dragState,
    setDragState,
    handlePiecePointerDown,
    blockedSlotIds,
    warningSlotIds,
  } = usePieceDrag({
    board: gameState.board,
    tray: gameState.tray,
    boardMetricsRef,
    boardRef,
    gameOver: gameState.status === 'game-over',
    selectedTool,
    onPlace: (slotId, position) =>
      dispatchAction({ type: 'place-piece', slotId, position }),
    onUnlockAudio: unlockAudio,
    onWarmUpSpeech: warmUpSpeech,
    onPlayDragWhoosh: playDragWhoosh,
    getBoardMetrics,
    refreshBoardMetrics,
  })


  useEffect(() => {
    if (debugProfiler.isEnabled()) debugProfiler.startSession()
  }, [])

  useEffect(() => {
    if (gameState.score > bestScore) onBestScoreChange(gameState.score)
  }, [bestScore, gameState.score, onBestScoreChange])

  const handleReward = useCallback(
    async (mode: 'ad' | 'shop') => {
      if (!pendingTool) return
      setRewardLoading(true)
      const reward =
        mode === 'ad' ? await showRewardedAd(pendingTool) : await purchasePack(pendingTool)
      dispatchAction({ type: 'grant-reward', reward })
      setRewardLoading(false)
      setShopOpen(false)
      setPendingTool(null)
    },
    [pendingTool, dispatchAction],
  )

  const restartGame = useCallback(() => {
    setDragState(null)
    setSelectedTool(null)
    setHoveredBoardCell(null)
    setPendingTool(null)
    setShopOpen(false)
    resetForRestart()
    startTransition(() => setGameState(createInitialGameState()))
  }, [setDragState, setSelectedTool, setHoveredBoardCell, resetForRestart])

  const blockedPiece = useMemo(
    () =>
      gameState.tray.find((slot) => !slot.used && blockedSlotIds.has(slot.slotId))?.piece ?? null,
    [blockedSlotIds, gameState.tray],
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
    if (!dragState) return undefined
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
          <span
            className={[
              'game-stage__score-item',
              'game-stage__score-item--current',
              gameState.comboStreak > 1 ? 'game-stage__score-item--charged' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="game-stage__score-label">Score</span>
            <strong>{gameState.score}</strong>
            {gameState.comboStreak > 1 ? (
              <em className="game-stage__score-combo">x{gameState.comboStreak}</em>
            ) : null}
          </span>
        </div>

        <ComboBanner text={comboText} anchor={comboAnchor} />
        <ClearParticleFx particles={clearParticles} />
        <ScoreBurst floatingScores={floatingScores} />

        <div className="game-stage__board-wrap">
          <Board
            board={gameState.board}
            preview={dragState?.preview ?? null}
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
            trayCellSize={Math.min(
              boardMetrics.cellSize,
              typeof window !== 'undefined' && window.innerWidth <= 480 ? 24 : 28,
            )}
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
