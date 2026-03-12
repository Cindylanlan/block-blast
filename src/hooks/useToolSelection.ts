import { useCallback, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

import type { PlacementPosition, ToolType } from '../game/types'
import { getBombCells, getHammerCells } from '../game/tools'
import type { BoardMatrix } from '../game/types'

interface UseToolSelectionArgs {
  board: BoardMatrix
  toolInventory: { reroll: number; bomb: number; hammer: number }
  onReroll: () => void
  onUseTool: (tool: Exclude<ToolType, 'reroll'>, position: PlacementPosition) => void
  onOpenShop: (tool: ToolType) => void
  onUnlockAudio: () => void
  onWarmUpSpeech: () => void
  getBoardCellFromPointer: (clientX: number, clientY: number) => PlacementPosition | null
}

const getToolPreviewCells = (
  tool: ToolType | null,
  board: BoardMatrix,
  position: PlacementPosition | null,
) => {
  if (!tool || !position) return []
  if (tool === 'hammer') return getHammerCells(board, position)
  if (tool === 'bomb') return getBombCells(board, position)
  return []
}

export function useToolSelection({
  board,
  toolInventory,
  onReroll,
  onUseTool,
  onOpenShop,
  onUnlockAudio,
  onWarmUpSpeech,
  getBoardCellFromPointer,
}: UseToolSelectionArgs) {
  const [selectedTool, setSelectedTool] = useState<ToolType | null>(null)
  const [hoveredBoardCell, setHoveredBoardCell] = useState<PlacementPosition | null>(null)
  const onUseToolRef = useRef(onUseTool)
  onUseToolRef.current = onUseTool

  const handleToolSelect = useCallback(
    (tool: ToolType) => {
      onUnlockAudio()
      if (toolInventory[tool] <= 0) {
        onOpenShop(tool)
        return
      }
      if (tool === 'reroll') {
        onReroll()
        setSelectedTool(null)
        return
      }
      setSelectedTool((current) => (current === tool ? null : tool))
    },
    [toolInventory, onOpenShop, onReroll, onUnlockAudio],
  )

  const handleBoardPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!selectedTool || selectedTool === 'reroll') return
      setHoveredBoardCell(getBoardCellFromPointer(event.clientX, event.clientY))
    },
    [selectedTool, getBoardCellFromPointer],
  )

  const handleBoardPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!selectedTool || selectedTool === 'reroll') return
      onUnlockAudio()
      onWarmUpSpeech()
      const cell = getBoardCellFromPointer(event.clientX, event.clientY)
      if (!cell) return
      if (toolInventory[selectedTool] <= 0) {
        onOpenShop(selectedTool)
        return
      }
      onUseToolRef.current(selectedTool, cell)
      setSelectedTool(null)
      setHoveredBoardCell(null)
    },
    [selectedTool, toolInventory, onOpenShop, onUnlockAudio, onWarmUpSpeech, getBoardCellFromPointer],
  )

  const highlightedCells = useMemo(
    () => getToolPreviewCells(selectedTool, board, hoveredBoardCell),
    [selectedTool, board, hoveredBoardCell],
  )

  return {
    selectedTool,
    setSelectedTool,
    hoveredBoardCell,
    setHoveredBoardCell,
    handleToolSelect,
    handleBoardPointerMove,
    handleBoardPointerDown,
    highlightedCells,
  }
}
