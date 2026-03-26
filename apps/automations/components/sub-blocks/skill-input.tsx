'use client'

import { useMemo } from 'react'
import type { SubBlockInputProps } from './shared'
import { baseInputClass, baseStyle } from './shared'

// Skills available for agent blocks
const AVAILABLE_SKILLS = [
  { id: 'web_search', label: 'Web Search' },
  { id: 'web_scrape', label: 'Web Scrape' },
  { id: 'code_execution', label: 'Code Execution' },
  { id: 'file_operations', label: 'File Operations' },
  { id: 'image_generation', label: 'Image Generation' },
  { id: 'document_analysis', label: 'Document Analysis' },
]

export function SkillInput({ value, onChange }: SubBlockInputProps) {
  const selected: string[] = useMemo(() => {
    if (Array.isArray(value)) return value
    if (typeof value === 'string' && value) return value.split(',').filter(Boolean)
    return []
  }, [value])

  function toggle(id: string) {
    const next = selected.includes(id)
      ? selected.filter((s) => s !== id)
      : [...selected, id]
    onChange(next)
  }

  return (
    <div className="space-y-1">
      {AVAILABLE_SKILLS.map((skill) => (
        <label
          key={skill.id}
          className="flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer hover:bg-zinc-50 transition-colors"
        >
          <input
            type="checkbox"
            checked={selected.includes(skill.id)}
            onChange={() => toggle(skill.id)}
            className="rounded border-zinc-300"
          />
          <span className="text-xs" style={{ color: 'var(--color-text-primary)' }}>
            {skill.label}
          </span>
        </label>
      ))}
    </div>
  )
}
