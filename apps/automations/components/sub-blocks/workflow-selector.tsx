'use client'

import { useEffect, useMemo, useState } from 'react'
import type { SubBlockInputProps } from './shared'
import { baseInputClass, baseStyle } from './shared'

interface WorkflowOption {
  id: string
  name: string
}

export function WorkflowSelector({ value, onChange }: SubBlockInputProps) {
  const [workflows, setWorkflows] = useState<WorkflowOption[]>([])

  useEffect(() => {
    fetch('/api/workflows')
      .then((r) => r.json())
      .then(({ workflows: wfs }) => {
        if (Array.isArray(wfs)) {
          setWorkflows(wfs.map((w: any) => ({ id: w.id, name: w.name })))
        }
      })
      .catch(() => {})
  }, [])

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className={baseInputClass}
      style={baseStyle}
    >
      <option value="">Select workflow\u2026</option>
      {workflows.map((wf) => (
        <option key={wf.id} value={wf.id}>
          {wf.name}
        </option>
      ))}
    </select>
  )
}
