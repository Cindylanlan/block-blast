import type { ReactNode } from 'react'

import type { ToolInventory, ToolType } from '../game/types'

interface ToolBarProps {
  inventory: ToolInventory
  selectedTool: ToolType | null
  onSelectTool: (tool: ToolType) => void
  onOpenShop: () => void
}

const TOOL_META: Record<ToolType, { label: string; icon: ReactNode }> = {
  reroll: {
    label: 'Reroll',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M7 7h7a5 5 0 0 1 4.2 2.3M17 5v4h-4M17 17H10a5 5 0 0 1-4.2-2.3M7 19v-4h4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  bomb: {
    label: 'Bomb',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M13 3h4M12 8l1.8-1.8M12 21a7 7 0 1 0 0-14a7 7 0 0 0 0 14Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="14" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  hammer: {
    label: 'Hammer',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M5 7h7l2 2l-3 3M11 10l8 8M10 11l-5 5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
}

export function ToolBar({
  inventory,
  selectedTool,
  onSelectTool,
  onOpenShop,
}: ToolBarProps) {
  const tools = Object.entries(inventory) as Array<[ToolType, number]>

  return (
    <section className="tool-bar">
      <div className="tool-bar__items">
        {tools.map(([tool, count]) => (
          <button
            key={tool}
            type="button"
            className={[
              'tool-chip',
              selectedTool === tool ? 'tool-chip--active' : '',
              count <= 0 ? 'tool-chip--empty' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onSelectTool(tool)}
          >
            <span className="tool-chip__icon">{TOOL_META[tool].icon}</span>
            <span className="tool-chip__label">{TOOL_META[tool].label}</span>
            <strong className="tool-chip__count">{count}</strong>
          </button>
        ))}
      </div>

      <button type="button" className="tool-shop-button" onClick={onOpenShop}>
        Get Tools
      </button>
    </section>
  )
}
