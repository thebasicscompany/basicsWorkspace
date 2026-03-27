'use client'

import { memo, useCallback, useEffect, useRef } from 'react'
import { Copy, Trash, CopySimple } from '@phosphor-icons/react'

interface BlockContextMenuProps {
  x: number
  y: number
  blockId: string
  blockName: string
  onClose: () => void
  onDelete: (blockId: string) => void
  onDuplicate: (blockId: string) => void
  onCopy: (blockId: string) => void
}

/**
 * Right-click context menu for workflow blocks.
 * Actions: Copy, Duplicate, Delete.
 */
export const BlockContextMenu = memo(function BlockContextMenu({
  x,
  y,
  blockId,
  blockName,
  onClose,
  onDelete,
  onDuplicate,
  onCopy,
}: BlockContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const items = [
    {
      label: 'Copy',
      icon: Copy,
      action: () => { onCopy(blockId); onClose() },
    },
    {
      label: 'Duplicate',
      icon: CopySimple,
      action: () => { onDuplicate(blockId); onClose() },
    },
    {
      label: 'Delete',
      icon: Trash,
      action: () => { onDelete(blockId); onClose() },
      destructive: true,
    },
  ]

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[160px] rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-surface)] py-[4px] shadow-lg"
      style={{ left: x, top: y }}
    >
      <div className="px-[12px] py-[6px] text-[11px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wide truncate max-w-[200px]">
        {blockName}
      </div>
      {items.map((item) => (
        <button
          key={item.label}
          onClick={item.action}
          className={`flex w-full items-center gap-[8px] px-[12px] py-[6px] text-[13px] transition-colors hover:bg-[var(--color-bg-subtle)] ${
            item.destructive ? 'text-red-500 hover:text-red-600' : 'text-[var(--color-text-primary)]'
          }`}
        >
          <item.icon size={14} />
          {item.label}
        </button>
      ))}
    </div>
  )
})
