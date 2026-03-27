'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Trash, X, CaretDown, CaretRight } from '@phosphor-icons/react'
import { cn } from '@/lib/core/utils/cn'
import { useVariablesStore } from '@/apps/automations/stores/variables'
import type { Variable } from '@/apps/automations/stores/variables'
import { useWorkflowRegistry } from '@/apps/automations/stores/registry'

/**
 * Type options for variable type selection
 */
const TYPE_OPTIONS = [
  { label: 'Plain', value: 'plain' },
  { label: 'Number', value: 'number' },
  { label: 'Boolean', value: 'boolean' },
  { label: 'Object', value: 'object' },
  { label: 'Array', value: 'array' },
] as const

/**
 * UI constants for consistent styling and sizing
 */
const ICON_SIZE = 13
const HEADER_ICON_SIZE = 16
const MIN_WIDTH = 320
const MIN_HEIGHT = 200
const DEFAULT_WIDTH = 360
const DEFAULT_HEIGHT = 400

/**
 * User-facing strings for errors, labels, and placeholders
 */
const STRINGS = {
  errors: {
    emptyName: 'Variable name cannot be empty',
    duplicateName: 'Two variables cannot have the same name',
  },
  labels: {
    name: 'Name',
    type: 'Type',
    value: 'Value',
  },
  placeholders: {
    name: 'variableName',
    number: '42',
    boolean: 'true',
    plain: 'Plain text value',
    object: '{\n  "key": "value"\n}',
    array: '[\n  1, 2, 3\n]',
  },
  emptyState: 'No variables yet',
}

/**
 * Simple name validation — strip non-alphanumeric/underscore characters
 */
function validateName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '')
}

interface VariablesPanelProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Floating Variables panel component.
 *
 * Adapted from Sim's variables.tsx — uses our design tokens instead of emcn components.
 * Collaborative/socket sync stubbed; drag/resize simplified.
 */
export function VariablesPanel({ isOpen, onClose }: VariablesPanelProps) {
  const { activeWorkflowId } = useWorkflowRegistry()
  const { getVariablesByWorkflowId, addVariable, updateVariable, deleteVariable } =
    useVariablesStore()

  const workflowVariables = activeWorkflowId ? getVariablesByWorkflowId(activeWorkflowId) : []

  // Panel position + size
  const [position, setPosition] = useState({ x: 80, y: 80 })
  const [dimensions, setDimensions] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT })

  // Local UI state
  const [collapsedById, setCollapsedById] = useState<Record<string, boolean>>({})
  const [localNames, setLocalNames] = useState<Record<string, string>>({})
  const [nameErrors, setNameErrors] = useState<Record<string, string>>({})

  // Drag handling
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!isDragging) return
    const handleMouseMove = (e: MouseEvent) => {
      setPosition((prev) => ({
        x: prev.x + e.clientX - dragStart.x,
        y: prev.y + e.clientY - dragStart.y,
      }))
      setDragStart({ x: e.clientX, y: e.clientY })
    }
    const handleMouseUp = () => setIsDragging(false)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragStart])

  // Clean up stale local state when variables change
  useEffect(() => {
    const currentIds = new Set(workflowVariables.map((v) => v.id))
    setCollapsedById((prev) => {
      const filtered = Object.fromEntries(Object.entries(prev).filter(([id]) => currentIds.has(id)))
      return Object.keys(filtered).length !== Object.keys(prev).length ? filtered : prev
    })
    setLocalNames((prev) => {
      const filtered = Object.fromEntries(Object.entries(prev).filter(([id]) => currentIds.has(id)))
      return Object.keys(filtered).length !== Object.keys(prev).length ? filtered : prev
    })
    setNameErrors((prev) => {
      const filtered = Object.fromEntries(Object.entries(prev).filter(([id]) => currentIds.has(id)))
      return Object.keys(filtered).length !== Object.keys(prev).length ? filtered : prev
    })
  }, [workflowVariables])

  const toggleCollapsed = (variableId: string) => {
    setCollapsedById((prev) => ({ ...prev, [variableId]: !prev[variableId] }))
  }

  const clearVariableState = (variableId: string, clearNames = true) => {
    if (clearNames) {
      setLocalNames((prev) => {
        const updated = { ...prev }
        delete updated[variableId]
        return updated
      })
    }
    setNameErrors((prev) => {
      if (!prev[variableId]) return prev
      const updated = { ...prev }
      delete updated[variableId]
      return updated
    })
  }

  const handleAddVariable = useCallback(() => {
    if (!activeWorkflowId) return
    addVariable({
      name: '',
      type: 'plain',
      value: '',
      workflowId: activeWorkflowId,
    })
  }, [activeWorkflowId, addVariable])

  const handleRemoveVariable = useCallback(
    (variableId: string) => {
      deleteVariable(variableId)
    },
    [deleteVariable]
  )

  const handleUpdateVariable = useCallback(
    (variableId: string, field: 'name' | 'value' | 'type', value: any) => {
      updateVariable(variableId, { [field]: value })
    },
    [updateVariable]
  )

  const isDuplicateName = useCallback(
    (variableId: string, name: string): boolean => {
      const trimmedName = name.trim()
      return (
        !!trimmedName &&
        workflowVariables.some((v) => v.id !== variableId && v.name === trimmedName)
      )
    },
    [workflowVariables]
  )

  const handleVariableNameChange = useCallback((variableId: string, newName: string) => {
    const validatedName = validateName(newName)
    setLocalNames((prev) => ({ ...prev, [variableId]: validatedName }))
    clearVariableState(variableId, false)
  }, [])

  const handleVariableNameBlur = useCallback(
    (variableId: string) => {
      const localName = localNames[variableId]
      if (localName === undefined) return

      const trimmedName = localName.trim()
      if (!trimmedName) {
        setNameErrors((prev) => ({ ...prev, [variableId]: STRINGS.errors.emptyName }))
        return
      }

      if (isDuplicateName(variableId, trimmedName)) {
        setNameErrors((prev) => ({ ...prev, [variableId]: STRINGS.errors.duplicateName }))
        return
      }

      updateVariable(variableId, { name: trimmedName })
      clearVariableState(variableId)
    },
    [localNames, isDuplicateName, updateVariable]
  )

  const renderValueInput = useCallback(
    (variable: Variable) => {
      const variableValue =
        variable.value === ''
          ? ''
          : typeof variable.value === 'string'
            ? variable.value
            : JSON.stringify(variable.value, null, 2)

      if (variable.type === 'object' || variable.type === 'array') {
        return (
          <textarea
            className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-base)] px-2 py-1.5 font-mono text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:outline-none"
            style={{ minHeight: 80, resize: 'vertical' }}
            value={variableValue}
            onChange={(e) => handleUpdateVariable(variable.id, 'value', e.target.value)}
            placeholder={
              variable.type === 'object' ? STRINGS.placeholders.object : STRINGS.placeholders.array
            }
          />
        )
      }

      return (
        <input
          type="text"
          className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-base)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:outline-none"
          value={variableValue}
          onChange={(e) => handleUpdateVariable(variable.id, 'value', e.target.value)}
          placeholder={
            variable.type === 'number'
              ? STRINGS.placeholders.number
              : variable.type === 'boolean'
                ? STRINGS.placeholders.boolean
                : STRINGS.placeholders.plain
          }
        />
      )
    },
    [handleUpdateVariable]
  )

  if (!isOpen) return null

  return (
    <div
      className="fixed z-30 flex flex-col overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-lg"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        minWidth: MIN_WIDTH,
        minHeight: MIN_HEIGHT,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header (drag handle) */}
      <div
        className="flex h-8 flex-shrink-0 cursor-grab items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 active:cursor-grabbing"
        onMouseDown={(e) => {
          setIsDragging(true)
          setDragStart({ x: e.clientX, y: e.clientY })
        }}
      >
        <span className="text-sm font-medium text-[var(--color-text-primary)]">Variables</span>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleAddVariable()
            }}
            className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-base)] hover:text-[var(--color-text-primary)]"
            aria-label="Add new variable"
          >
            <Plus size={HEADER_ICON_SIZE} />
          </button>
          <button
            onClick={onClose}
            className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-base)] hover:text-[var(--color-text-primary)]"
            aria-label="Close variables panel"
          >
            <X size={HEADER_ICON_SIZE} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col overflow-hidden p-2">
        {workflowVariables.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-[var(--color-text-tertiary)]">
            {STRINGS.emptyState}
          </div>
        ) : (
          <div className="h-full overflow-y-auto overflow-x-hidden">
            <div className="w-full space-y-2">
              {workflowVariables.map((variable, index) => {
                const isCollapsed = collapsedById[variable.id] ?? false

                return (
                  <div
                    key={variable.id}
                    className="rounded border border-[var(--color-border)] bg-[var(--color-bg-surface)]"
                  >
                    {/* Variable header */}
                    <div
                      className="flex cursor-pointer items-center justify-between rounded-t bg-[var(--color-bg-base)] px-2.5 py-1.5"
                      onClick={() => toggleCollapsed(variable.id)}
                      role="button"
                      tabIndex={0}
                      aria-expanded={!isCollapsed}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          toggleCollapsed(variable.id)
                        }
                      }}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        {isCollapsed ? (
                          <CaretRight size={12} className="text-[var(--color-text-tertiary)]" />
                        ) : (
                          <CaretDown size={12} className="text-[var(--color-text-tertiary)]" />
                        )}
                        <span className="truncate text-xs font-medium text-[var(--color-text-secondary)]">
                          {variable.name || `Variable ${index + 1}`}
                        </span>
                        {variable.name && (
                          <span className="rounded bg-[var(--color-bg-surface)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-tertiary)]">
                            {variable.type}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveVariable(variable.id)
                        }}
                        className="rounded p-0.5 text-[var(--color-text-tertiary)] hover:text-red-500"
                        aria-label={`Delete ${variable.name || `variable ${index + 1}`}`}
                      >
                        <Trash size={ICON_SIZE} />
                      </button>
                    </div>

                    {/* Variable content */}
                    {!isCollapsed && (
                      <div className="flex flex-col gap-2 border-t border-[var(--color-border)] bg-[var(--color-bg-surface)] px-2.5 py-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-medium text-[var(--color-text-tertiary)]">
                            {STRINGS.labels.name}
                          </label>
                          <input
                            type="text"
                            className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-base)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:outline-none"
                            value={localNames[variable.id] ?? variable.name}
                            onChange={(e) => handleVariableNameChange(variable.id, e.target.value)}
                            onBlur={() => handleVariableNameBlur(variable.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.currentTarget.blur()
                            }}
                            placeholder={STRINGS.placeholders.name}
                          />
                          {nameErrors[variable.id] && (
                            <p className="text-[11px] text-red-500" role="alert">
                              {nameErrors[variable.id]}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-medium text-[var(--color-text-tertiary)]">
                            {STRINGS.labels.type}
                          </label>
                          <select
                            className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-base)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
                            value={variable.type}
                            onChange={(e) =>
                              handleUpdateVariable(variable.id, 'type', e.target.value)
                            }
                          >
                            {TYPE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-medium text-[var(--color-text-tertiary)]">
                            {STRINGS.labels.value}
                          </label>
                          {renderValueInput(variable)}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
