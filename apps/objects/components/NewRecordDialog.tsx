"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import type { ObjectField } from "@/lib/db/schema"
import type { ObjectConfig } from "@/apps/objects/hooks/useObjectConfig"

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: ObjectField
  value: unknown
  onChange: (val: unknown) => void
}) {
  const inputStyle = {
    height: 34,
    fontSize: 13,
    color: "var(--color-text-primary)",
    background: "var(--color-bg-surface)",
    borderColor: "var(--color-border)",
  }

  switch (field.type) {
    case "select":
      return (
        <select
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value || undefined)}
          className="w-full outline-none rounded-lg px-3 border appearance-none"
          style={inputStyle}
        >
          <option value="">— None —</option>
          {(field.options ?? []).map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      )

    case "multi_select":
      return (
        <div className="flex flex-wrap gap-2">
          {(field.options ?? []).map((o) => {
            const selected = Array.isArray(value) ? (value as string[]).includes(o.id) : false
            return (
              <label key={o.id} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(e) => {
                    const prev = Array.isArray(value) ? (value as string[]) : []
                    onChange(e.target.checked ? [...prev, o.id] : prev.filter((id) => id !== o.id))
                  }}
                  className="w-3.5 h-3.5"
                />
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{o.label}</span>
              </label>
            )
          })}
        </div>
      )

    case "checkbox":
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4"
          />
          <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Yes</span>
        </label>
      )

    case "number":
      return (
        <input
          type="number"
          value={value == null ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          className="w-full outline-none rounded-lg px-3 border"
          style={inputStyle}
          placeholder="0"
        />
      )

    case "date":
      return (
        <input
          type="date"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value || undefined)}
          className="w-full outline-none rounded-lg px-3 border"
          style={inputStyle}
        />
      )

    case "email":
      return (
        <input
          type="email"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder={`Enter ${field.name.toLowerCase()}`}
          className="w-full outline-none rounded-lg px-3 border"
          style={inputStyle}
        />
      )

    case "url":
      return (
        <input
          type="url"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder="https://"
          className="w-full outline-none rounded-lg px-3 border"
          style={inputStyle}
        />
      )

    case "phone":
      return (
        <input
          type="tel"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder="+1 (555) 000-0000"
          className="w-full outline-none rounded-lg px-3 border"
          style={inputStyle}
        />
      )

    default: // text, relation
      return (
        <input
          type="text"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder={`Enter ${field.name.toLowerCase()}`}
          className="w-full outline-none rounded-lg px-3 border"
          style={inputStyle}
        />
      )
  }
}

export function NewRecordDialog({
  open,
  onOpenChange,
  config,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: ObjectConfig
  onCreated: () => void
}) {
  const [data, setData] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sorted = [...config.fields].sort((a, b) => a.position - b.position)

  function reset() {
    setData({})
    setError(null)
  }

  function setField(key: string, val: unknown) {
    setData((prev) => {
      if (val == null || val === "" || (Array.isArray(val) && val.length === 0)) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: val }
    })
  }

  async function save() {
    // Validate required fields
    const missing = sorted.filter((f) => f.required && (data[f.key] == null || data[f.key] === ""))
    if (missing.length > 0) {
      setError(`Required: ${missing.map((f) => f.name).join(", ")}`)
      return
    }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ object_type: config.slug, data }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      reset()
      onOpenChange(false)
      onCreated()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) reset(); onOpenChange(val) }}>
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>New {config.name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1 max-h-96 overflow-y-auto pr-1">
          {sorted.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", textAlign: "center", padding: "16px 0" }}>
              No fields defined. Add fields first.
            </p>
          ) : (
            sorted.map((field) => (
              <div key={field.id} className="flex flex-col gap-1.5">
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: "var(--color-text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {field.name}
                  {field.required && (
                    <span style={{ color: "#EF4444", marginLeft: 3 }}>*</span>
                  )}
                </label>
                <FieldInput
                  field={field}
                  value={data[field.key]}
                  onChange={(val) => setField(field.key, val)}
                />
              </div>
            ))
          )}

          {error && (
            <p style={{ fontSize: 12, color: "#EF4444" }}>{error}</p>
          )}
        </div>

        <DialogFooter showCloseButton={false}>
          <button
            onClick={() => { reset(); onOpenChange(false) }}
            className="px-4 py-2 rounded-lg text-sm transition-colors"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || sorted.length === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              background: "var(--color-accent)",
              color: "white",
              opacity: saving || sorted.length === 0 ? 0.5 : 1,
            }}
          >
            {saving ? "Saving…" : `Add ${config.name}`}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
