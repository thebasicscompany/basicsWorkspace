"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { OBJECT_ICON_MAP, PICKER_ICONS, COLOR_OPTIONS } from "@/apps/objects/icons"

function toSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
}

function toPlural(name: string) {
  const t = name.trim()
  if (!t) return ""
  if (/s$/i.test(t)) return t + "es"
  if (/y$/i.test(t)) return t.slice(0, -1) + "ies"
  return t + "s"
}

export function NewObjectDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [namePlural, setNamePlural] = useState("")
  const [pluralTouched, setPluralTouched] = useState(false)
  const [icon, setIcon] = useState("Cube")
  const [color, setColor] = useState("text-violet-500")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function resetForm() {
    setName("")
    setNamePlural("")
    setPluralTouched(false)
    setIcon("Cube")
    setColor("text-violet-500")
    setError(null)
  }

  function handleNameChange(val: string) {
    setName(val)
    if (!pluralTouched) setNamePlural(toPlural(val))
  }

  async function create() {
    const slug = toSlug(name)
    if (!slug) { setError("Name is required"); return }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/objects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          name: name.trim(),
          namePlural: namePlural.trim() || toPlural(name),
          icon,
          color,
          fields: [],
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `${res.status}`)
      }
      const obj = await res.json()
      onOpenChange(false)
      resetForm()
      onCreated?.()
      router.push(`/objects/${obj.slug}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) resetForm()
        onOpenChange(val)
      }}
    >
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>New object type</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Name
            </label>
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Vendor"
              autoFocus
              className="w-full outline-none rounded-lg px-3 border"
              style={{
                height: 34,
                fontSize: 13,
                color: "var(--color-text-primary)",
                background: "var(--color-bg-surface)",
                borderColor: "var(--color-border)",
              }}
              onKeyDown={(e) => e.key === "Enter" && create()}
            />
          </div>

          {/* Plural name */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Plural name
            </label>
            <input
              value={namePlural}
              onChange={(e) => { setNamePlural(e.target.value); setPluralTouched(true) }}
              placeholder="e.g. Vendors"
              className="w-full outline-none rounded-lg px-3 border"
              style={{
                height: 34,
                fontSize: 13,
                color: "var(--color-text-primary)",
                background: "var(--color-bg-surface)",
                borderColor: "var(--color-border)",
              }}
            />
          </div>

          {/* Color */}
          <div className="flex flex-col gap-2">
            <label style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  title={c.label}
                  className="rounded-full transition-transform"
                  style={{
                    width: 22,
                    height: 22,
                    background: c.hex,
                    outline: color === c.value ? `2px solid ${c.hex}` : "none",
                    outlineOffset: 2,
                    transform: color === c.value ? "scale(1.15)" : "scale(1)",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Icon */}
          <div className="flex flex-col gap-2">
            <label style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Icon
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PICKER_ICONS.map((name) => {
                const Icon = OBJECT_ICON_MAP[name]
                const selectedColor = COLOR_OPTIONS.find((c) => c.value === color)?.hex ?? "#64748B"
                const isSelected = icon === name
                return (
                  <button
                    key={name}
                    onClick={() => setIcon(name)}
                    title={name}
                    className="flex items-center justify-center rounded-lg transition-all"
                    style={{
                      width: 34,
                      height: 34,
                      background: isSelected ? selectedColor : "var(--color-bg-base)",
                      border: `1px solid ${isSelected ? selectedColor : "var(--color-border)"}`,
                      color: isSelected ? "white" : "var(--color-text-secondary)",
                    }}
                  >
                    <Icon size={16} weight="fill" />
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <p style={{ fontSize: 12, color: "#EF4444" }}>{error}</p>
          )}
        </div>

        <DialogFooter showCloseButton={false}>
          <button
            onClick={() => { resetForm(); onOpenChange(false) }}
            className="px-4 py-2 rounded-full text-sm transition-colors"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Cancel
          </button>
          <button
            onClick={create}
            disabled={saving || !name.trim()}
            className="px-4 py-2 rounded-full text-sm font-medium transition-colors hover:opacity-90"
            style={{
              background: "var(--color-accent)",
              color: "white",
              opacity: saving || !name.trim() ? 0.5 : 1,
            }}
          >
            {saving ? "Creating…" : "Create object"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
