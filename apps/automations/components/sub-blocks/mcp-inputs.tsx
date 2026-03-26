'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash } from '@phosphor-icons/react'
import type { SubBlockInputProps } from './shared'
import { baseInputClass, baseStyle } from './shared'

/**
 * MCP Server Selector — select an MCP server by URL.
 */
export function McpServerSelector({ value, onChange }: SubBlockInputProps) {
  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter MCP server URL\u2026"
      className={baseInputClass}
      style={baseStyle}
    />
  )
}

/**
 * MCP Tool Selector — pick a tool from the connected MCP server.
 */
export function McpToolSelector({ value, onChange }: SubBlockInputProps) {
  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter MCP tool name\u2026"
      className={baseInputClass}
      style={baseStyle}
    />
  )
}

/**
 * MCP Dynamic Args — configure arguments for the selected MCP tool.
 * Renders as key-value pairs.
 */
interface McpArg {
  id: string
  key: string
  value: string
}

export function McpDynamicArgs({ value, onChange }: SubBlockInputProps) {
  const [args, setArgs] = useState<McpArg[]>(() => parseArgs(value))

  useEffect(() => {
    setArgs(parseArgs(value))
  }, [value])

  const persist = useCallback(
    (a: McpArg[]) => {
      setArgs(a)
      onChange(a)
    },
    [onChange]
  )

  const updateArg = useCallback(
    (idx: number, updates: Partial<McpArg>) => {
      const next = args.map((a, i) => (i === idx ? { ...a, ...updates } : a))
      persist(next)
    },
    [args, persist]
  )

  const addArg = useCallback(() => {
    persist([...args, { id: crypto.randomUUID(), key: '', value: '' }])
  }, [args, persist])

  const removeArg = useCallback(
    (idx: number) => {
      persist(args.filter((_, i) => i !== idx))
    },
    [args, persist]
  )

  return (
    <div className="space-y-1.5">
      {args.map((arg, idx) => (
        <div key={arg.id} className="flex items-center gap-1.5">
          <input
            type="text"
            value={arg.key}
            onChange={(e) => updateArg(idx, { key: e.target.value })}
            placeholder="Argument"
            className={`${baseInputClass} flex-1`}
            style={baseStyle}
          />
          <input
            type="text"
            value={arg.value}
            onChange={(e) => updateArg(idx, { value: e.target.value })}
            placeholder="Value"
            className={`${baseInputClass} flex-1`}
            style={baseStyle}
          />
          <button
            onClick={() => removeArg(idx)}
            className="p-1 rounded hover:bg-zinc-100 transition-colors flex-shrink-0"
          >
            <Trash size={10} style={{ color: 'var(--color-text-tertiary)' }} />
          </button>
        </div>
      ))}

      <button
        onClick={addArg}
        className="flex items-center gap-1.5 text-[10px] font-medium transition-colors hover:opacity-70"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        <Plus size={10} />
        Add argument
      </button>
    </div>
  )
}

function parseArgs(value: any): McpArg[] {
  if (Array.isArray(value)) return value
  return []
}
