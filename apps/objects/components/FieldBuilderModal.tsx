"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Trash, Plus, CaretUp, CaretDown, DotsSixVertical } from "@phosphor-icons/react"
import type { ObjectField } from "@/lib/db/schema"
import type { ObjectConfig } from "@/apps/objects/hooks/useObjectConfig"

const FIELD_TYPES: { value: ObjectField["type"]; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Select" },
  { value: "multi_select", label: "Multi-select" },
  { value: "checkbox", label: "Checkbox" },
  { value: "url", label: "URL" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "relation", label: "Relation" },
]

const OPTION_COLORS = [
  "#6366F1", "#8B5CF6", "#EC4899", "#EF4444", "#F97316",
  "#F59E0B", "#10B981", "#14B8A6", "#3B82F6", "#6B7280",
]

type Option = { id: string; label: string; color: string }

// ─── Options editor ─────────────────────────────────────────────────────────

function OptionsEditor({
  options,
  onChange,
}: {
  options: Option[]
  onChange: (opts: Option[]) => void
}) {
  function add() {
    const color = OPTION_COLORS[options.length % OPTION_COLORS.length]
    onChange([...options, { id: crypto.randomUUID(), label: "Option", color }])
  }

  function remove(id: string) {
    onChange(options.filter((o) => o.id !== id))
  }

  function update(id: string, patch: Partial<Option>) {
    onChange(options.map((o) => (o.id === id ? { ...o, ...patch } : o)))
  }

  return (
    <div className="px-3 pb-2 flex flex-col gap-1.5 border-t mt-0.5 pt-2" style={{ borderColor: "var(--color-border)" }}>
      {options.map((opt) => (
        <div key={opt.id} className="flex items-center gap-2">
          <input
            type="color"
            value={opt.color}
            onChange={(e) => update(opt.id, { color: e.target.value })}
            className="w-5 h-5 rounded cursor-pointer border-0 p-0 shrink-0"
          />
          <input
            value={opt.label}
            onChange={(e) => update(opt.id, { label: e.target.value })}
            className="flex-1 bg-transparent outline-none border-b"
            style={{ fontSize: 12, color: "var(--color-text-primary)", borderColor: "var(--color-border)" }}
            placeholder="Option label"
          />
          <button
            onClick={() => remove(opt.id)}
            className="flex items-center justify-center shrink-0"
            style={{ color: "var(--color-text-tertiary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#EF4444")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-tertiary)")}
          >
            <Trash size={11} />
          </button>
        </div>
      ))}
      <button
        onClick={add}
        className="flex items-center gap-1 text-left"
        style={{ fontSize: 11, color: "var(--color-accent)", background: "transparent" }}
      >
        <Plus size={10} />
        Add option
      </button>
    </div>
  )
}

// ─── Field row ───────────────────────────────────────────────────────────────

function FieldRow({
  field,
  index,
  total,
  expanded,
  onExpand,
  onChange,
  onMove,
  onRemove,
}: {
  field: ObjectField
  index: number
  total: number
  expanded: boolean
  onExpand: () => void
  onChange: (patch: Partial<ObjectField>) => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
}) {
  const hasOptions = field.type === "select" || field.type === "multi_select"

  return (
    <div
      className="rounded-lg border"
      style={{ borderColor: "var(--color-border)", background: "var(--color-bg-surface)" }}
    >
      {/* Main row */}
      <div className="flex items-center gap-1.5 px-2 h-9">
        <DotsSixVertical
          size={13}
          style={{ color: "var(--color-text-tertiary)", cursor: "grab", flexShrink: 0 }}
        />

        <input
          value={field.name}
          onChange={(e) => {
            const name = e.target.value
            const key = name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") || field.key
            onChange({ name, key })
          }}
          className="flex-1 bg-transparent outline-none min-w-0"
          style={{ fontSize: 13, color: "var(--color-text-primary)" }}
          placeholder="Field name"
        />

        <select
          value={field.type}
          onChange={(e) => onChange({ type: e.target.value as ObjectField["type"] })}
          className="bg-transparent outline-none shrink-0"
          style={{ fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer" }}
        >
          {FIELD_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <label className="flex items-center gap-1 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => onChange({ required: e.target.checked })}
            className="w-3 h-3"
          />
          <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Req</span>
        </label>

        {hasOptions && (
          <button
            onClick={onExpand}
            className="flex items-center justify-center rounded p-0.5 shrink-0"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            {expanded ? <CaretUp size={11} /> : <CaretDown size={11} />}
          </button>
        )}

        <div className="flex items-center gap-0 shrink-0">
          <button
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="flex items-center justify-center rounded p-0.5 disabled:opacity-25"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            <CaretUp size={11} />
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="flex items-center justify-center rounded p-0.5 disabled:opacity-25"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            <CaretDown size={11} />
          </button>
          <button
            onClick={onRemove}
            className="flex items-center justify-center rounded p-0.5 shrink-0"
            style={{ color: "var(--color-text-tertiary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#EF4444")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-tertiary)")}
          >
            <Trash size={11} />
          </button>
        </div>
      </div>

      {/* Select options editor */}
      {hasOptions && expanded && (
        <OptionsEditor
          options={field.options ?? []}
          onChange={(options) => onChange({ options })}
        />
      )}

      {/* Relation config */}
      {field.type === "relation" && (
        <div
          className="px-3 pb-2 flex items-center gap-2 border-t pt-2"
          style={{ borderColor: "var(--color-border)" }}
        >
          <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Relates to:</span>
          <input
            value={field.relationTo ?? ""}
            onChange={(e) => onChange({ relationTo: e.target.value })}
            placeholder="object slug (e.g. contacts)"
            className="flex-1 bg-transparent outline-none border-b"
            style={{ fontSize: 12, color: "var(--color-text-secondary)", borderColor: "var(--color-border)" }}
          />
        </div>
      )}
    </div>
  )
}

// ─── Modal ───────────────────────────────────────────────────────────────────

export function FieldBuilderModal({
  open,
  onOpenChange,
  config,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: ObjectConfig
  onSaved: (updated: ObjectConfig) => void
}) {
  const [fields, setFields] = useState<ObjectField[]>([])
  const [saving, setSaving] = useState(false)
  const [expandedField, setExpandedField] = useState<string | null>(null)

  // Reset state whenever the modal opens
  useEffect(() => {
    if (open) {
      setFields([...config.fields].sort((a, b) => a.position - b.position))
      setExpandedField(null)
    }
  }, [open, config.fields])

  function addField() {
    const id = crypto.randomUUID()
    const newField: ObjectField = {
      id,
      name: "New Field",
      key: `field_${Date.now()}`,
      type: "text",
      required: false,
      position: fields.length,
    }
    setFields((prev) => [...prev, newField])
    setExpandedField(null)
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id))
    if (expandedField === id) setExpandedField(null)
  }

  function updateField(id: string, patch: Partial<ObjectField>) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }

  function moveField(id: string, dir: -1 | 1) {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === id)
      if (idx === -1) return prev
      const swap = idx + dir
      if (swap < 0 || swap >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[swap]] = [next[swap], next[idx]]
      return next.map((f, i) => ({ ...f, position: i }))
    })
  }

  async function save() {
    setSaving(true)
    try {
      const normalized = fields.map((f, i) => ({ ...f, position: i }))
      const res = await fetch(`/api/objects/${config.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: normalized }),
      })
      if (!res.ok) throw new Error(await res.text())
      const updated: ObjectConfig = await res.json()
      onSaved(updated)
      onOpenChange(false)
    } catch (e) {
      alert("Failed to save: " + (e instanceof Error ? e.message : "Unknown"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Edit Fields — {config.namePlural}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-1 max-h-80 overflow-y-auto py-1 pr-1">
          {fields.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", textAlign: "center", padding: "16px 0" }}>
              No fields yet. Add one below.
            </p>
          )}
          {fields.map((field, i) => (
            <FieldRow
              key={field.id}
              field={field}
              index={i}
              total={fields.length}
              expanded={expandedField === field.id}
              onExpand={() =>
                setExpandedField(expandedField === field.id ? null : field.id)
              }
              onChange={(patch) => updateField(field.id, patch)}
              onMove={(dir) => moveField(field.id, dir)}
              onRemove={() => removeField(field.id)}
            />
          ))}
        </div>

        <button
          onClick={addField}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm w-full text-left transition-colors"
          style={{
            color: "var(--color-accent)",
            border: "1px dashed var(--color-border)",
            background: "transparent",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-accent-light)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <Plus size={14} />
          Add field
        </button>

        <DialogFooter showCloseButton={false}>
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-lg text-sm transition-colors"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-full text-sm font-medium transition-colors hover:opacity-90"
            style={{
              background: "var(--color-accent)",
              color: "white",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving…" : "Save fields"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
