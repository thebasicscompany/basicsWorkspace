"use client"

import { useState, useId } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { X, Plus, DotsSixVertical, Trash, PencilSimple, Check } from "@phosphor-icons/react"
import type { ObjectField } from "@/lib/db/schema"
import { FIELD_TYPES, OPTION_COLORS, getFieldTypeMeta } from "./field-types"

// ─── Types ───────────────────────────────────────────────────────────────────

type Mode = "list" | "pick-type" | "configure"

type FieldBuilderModalProps = {
  open: boolean
  onClose: () => void
  objectSlug: string
  objectName: string
  initialFields: ObjectField[]
  onSaved: (fields: ObjectField[]) => void
}

// ─── Sortable Field Row ───────────────────────────────────────────────────────

function SortableFieldRow({
  field,
  isSystem,
  onEdit,
  onDelete,
}: {
  field: ObjectField
  isSystem: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id })

  const meta = getFieldTypeMeta(field.type)
  const Icon = meta.icon

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border group transition-shadow ${
        isDragging
          ? "shadow-lg bg-white border-[var(--color-accent)] z-10"
          : "bg-white border-[var(--color-border)] hover:border-zinc-300"
      }`}
    >
      {/* Drag handle */}
      {!isSystem && (
        <button
          {...attributes}
          {...listeners}
          className="touch-none cursor-grab active:cursor-grabbing text-zinc-300 hover:text-zinc-500"
          tabIndex={-1}
        >
          <DotsSixVertical size={16} />
        </button>
      )}
      {isSystem && <div className="w-4" />}

      {/* Type icon */}
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--color-bg-base)" }}
      >
        <Icon size={14} className="text-zinc-500" />
      </div>

      {/* Name + type */}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
          {field.name}
        </span>
      </div>

      <span
        className="text-xs px-2 py-0.5 rounded-full font-medium"
        style={{ background: "var(--color-bg-base)", color: "var(--color-text-secondary)" }}
      >
        {meta.label}
      </span>

      {field.required && (
        <span className="text-xs text-red-500 font-medium">Required</span>
      )}

      {/* Actions */}
      {!isSystem && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600"
          >
            <PencilSimple size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500"
          >
            <Trash size={14} />
          </button>
        </div>
      )}
      {isSystem && (
        <span className="text-xs text-zinc-400 italic">system</span>
      )}
    </div>
  )
}

// ─── Type Picker ─────────────────────────────────────────────────────────────

function TypePicker({ onSelect }: { onSelect: (type: ObjectField["type"]) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {FIELD_TYPES.map(({ type, label, icon: Icon, description }) => (
        <button
          key={type}
          onClick={() => onSelect(type)}
          className="flex items-center gap-3 p-3 rounded-lg border text-left transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-light)] group"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-[var(--color-accent-light)]"
            style={{ background: "var(--color-bg-base)" }}
          >
            <Icon size={16} className="text-zinc-500 group-hover:text-[var(--color-accent)]" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
              {label}
            </div>
            <div className="text-xs truncate" style={{ color: "var(--color-text-tertiary)" }}>
              {description}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

// ─── Field Config Form ────────────────────────────────────────────────────────

function FieldConfigForm({
  field,
  isNew,
  allSlugs: _allSlugs,
  onSave,
  onCancel,
}: {
  field: Partial<ObjectField> & { type: ObjectField["type"] }
  isNew: boolean
  allSlugs: string[]
  onSave: (f: ObjectField) => void
  onCancel: () => void
}) {
  const meta = getFieldTypeMeta(field.type)
  const Icon = meta.icon

  const [name, setName] = useState(field.name ?? "")
  const [required, setRequired] = useState(field.required ?? false)
  const [relationTo, setRelationTo] = useState(field.relationTo ?? "")
  const [options, setOptions] = useState<{ id: string; label: string; color: string }[]>(
    field.options ?? []
  )
  const [newOptionLabel, setNewOptionLabel] = useState("")

  const derivedKey = name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")

  function addOption() {
    if (!newOptionLabel.trim()) return
    setOptions((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label: newOptionLabel.trim(), color: "gray" },
    ])
    setNewOptionLabel("")
  }

  function removeOption(id: string) {
    setOptions((prev) => prev.filter((o) => o.id !== id))
  }

  function handleSave() {
    if (!name.trim()) return
    onSave({
      id: field.id ?? crypto.randomUUID(),
      name: name.trim(),
      key: field.key ?? derivedKey,
      type: field.type,
      required,
      options: ["select", "multi_select"].includes(field.type) ? options : undefined,
      relationTo: field.type === "relation" ? relationTo : undefined,
      position: field.position ?? 0,
    })
  }

  return (
    <div className="space-y-4">
      {/* Type badge */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center"
          style={{ background: "var(--color-bg-base)" }}
        >
          <Icon size={14} className="text-zinc-500" />
        </div>
        <span className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
          {meta.label} field
        </span>
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
          Field name
        </label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder={`e.g. ${meta.label}`}
          className="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors focus:border-[var(--color-accent)]"
          style={{ borderColor: "var(--color-border)", background: "var(--color-bg-surface)" }}
        />
        {name && (
          <p className="mt-1 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
            Key: <code className="font-mono">{derivedKey || "…"}</code>
          </p>
        )}
      </div>

      {/* Relation target */}
      {field.type === "relation" && (
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
            Relates to (object slug)
          </label>
          <input
            value={relationTo}
            onChange={(e) => setRelationTo(e.target.value)}
            placeholder="e.g. companies"
            className="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors focus:border-[var(--color-accent)]"
            style={{ borderColor: "var(--color-border)", background: "var(--color-bg-surface)" }}
          />
        </div>
      )}

      {/* Select options */}
      {["select", "multi_select"].includes(field.type) && (
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
            Options
          </label>
          <div className="space-y-1.5 mb-2">
            {options.map((opt) => (
              <div key={opt.id} className="flex items-center gap-2">
                <div className="flex gap-1">
                  {OPTION_COLORS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() =>
                        setOptions((prev) =>
                          prev.map((o) => (o.id === opt.id ? { ...o, color: c.id } : o))
                        )
                      }
                      className={`w-4 h-4 rounded-full ${c.bg} transition-transform ${
                        opt.color === c.id ? "ring-2 ring-offset-1 ring-zinc-400 scale-110" : ""
                      }`}
                    />
                  ))}
                </div>
                <span
                  className={`flex-1 text-sm px-2 py-0.5 rounded-full font-medium ${
                    OPTION_COLORS.find((c) => c.id === opt.color)?.bg ?? "bg-zinc-100"
                  } ${OPTION_COLORS.find((c) => c.id === opt.color)?.text ?? "text-zinc-600"}`}
                >
                  {opt.label}
                </span>
                <button
                  onClick={() => removeOption(opt.id)}
                  className="text-zinc-400 hover:text-red-500"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newOptionLabel}
              onChange={(e) => setNewOptionLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addOption()}
              placeholder="Add option…"
              className="flex-1 px-3 py-1.5 text-sm rounded-lg border outline-none focus:border-[var(--color-accent)]"
              style={{ borderColor: "var(--color-border)" }}
            />
            <button
              onClick={addOption}
              className="px-3 py-1.5 text-sm rounded-lg font-medium transition-colors"
              style={{ background: "var(--color-bg-base)", color: "var(--color-text-secondary)" }}
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Required toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <button
          role="switch"
          aria-checked={required}
          onClick={() => setRequired((r) => !r)}
          className={`w-9 h-5 rounded-full transition-colors relative ${
            required ? "bg-[var(--color-accent)]" : "bg-zinc-200"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              required ? "translate-x-4" : ""
            }`}
          />
        </button>
        <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>
          Required field
        </span>
      </label>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-40"
          style={{ background: "var(--color-accent)" }}
        >
          {isNew ? "Add field" : "Save changes"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: "var(--color-bg-base)", color: "var(--color-text-secondary)" }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function FieldBuilderModal({
  open,
  onClose,
  objectSlug,
  objectName,
  initialFields,
  onSaved,
}: FieldBuilderModalProps) {
  const [fields, setFields] = useState<ObjectField[]>(initialFields)
  const [mode, setMode] = useState<Mode>("list")
  const [selectedType, setSelectedType] = useState<ObjectField["type"] | null>(null)
  const [editingField, setEditingField] = useState<ObjectField | null>(null)
  const [saving, setSaving] = useState(false)

  // Reset on open
  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setFields(initialFields)
      setMode("list")
      setSelectedType(null)
      setEditingField(null)
    } else {
      onClose()
    }
  }

  const sensors = useSensors(useSensor(PointerSensor))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setFields((prev) => {
        const oldIndex = prev.findIndex((f) => f.id === active.id)
        const newIndex = prev.findIndex((f) => f.id === over.id)
        return arrayMove(prev, oldIndex, newIndex).map((f, i) => ({ ...f, position: i }))
      })
    }
  }

  function addField(f: ObjectField) {
    setFields((prev) => [...prev, { ...f, position: prev.length }])
    setMode("list")
    setSelectedType(null)
  }

  function updateField(updated: ObjectField) {
    setFields((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
    setMode("list")
    setEditingField(null)
  }

  function deleteField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id).map((f, i) => ({ ...f, position: i })))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/objects/${objectSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields }),
      })
      if (!res.ok) throw new Error(await res.text())
      onSaved(fields)
      onClose()
    } catch (err) {
      console.error("Failed to save fields:", err)
    } finally {
      setSaving(false)
    }
  }

  const systemFields = fields.filter((f) => initialFields.some((sf) => sf.id === f.id && sf.key === f.key))
  const isSystemField = (f: ObjectField) => {
    const init = initialFields.find((sf) => sf.id === f.id)
    return !!init
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="w-full max-w-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ background: "var(--color-bg-surface)", maxHeight: "85vh" }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: "var(--color-border)" }}
            >
              <div>
                <Dialog.Title className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {mode === "pick-type"
                    ? "Choose field type"
                    : mode === "configure"
                    ? editingField ? "Edit field" : "Configure field"
                    : `Fields — ${objectName}`}
                </Dialog.Title>
                {mode === "list" && (
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                    {fields.length} field{fields.length !== 1 ? "s" : ""} · drag to reorder
                  </p>
                )}
              </div>
              <Dialog.Close asChild>
                <button
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-zinc-100"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Field list */}
              {mode === "list" && (
                <div className="space-y-2">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={fields.map((f) => f.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {fields.map((field) => (
                        <SortableFieldRow
                          key={field.id}
                          field={field}
                          isSystem={isSystemField(field)}
                          onEdit={() => {
                            setEditingField(field)
                            setMode("configure")
                          }}
                          onDelete={() => deleteField(field.id)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>

                  {fields.length === 0 && (
                    <p className="text-sm text-center py-8" style={{ color: "var(--color-text-tertiary)" }}>
                      No fields yet. Add your first field below.
                    </p>
                  )}

                  <button
                    onClick={() => setMode("pick-type")}
                    className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed text-sm font-medium transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-light)]"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
                  >
                    <Plus size={14} />
                    Add field
                  </button>
                </div>
              )}

              {/* Type picker */}
              {mode === "pick-type" && (
                <div>
                  <button
                    onClick={() => setMode("list")}
                    className="text-xs mb-4 flex items-center gap-1 hover:underline"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    ← Back
                  </button>
                  <TypePicker
                    onSelect={(type) => {
                      setSelectedType(type)
                      setEditingField(null)
                      setMode("configure")
                    }}
                  />
                </div>
              )}

              {/* Field config */}
              {mode === "configure" && (selectedType || editingField) && (
                <div>
                  <button
                    onClick={() => {
                      setMode(editingField ? "list" : "pick-type")
                      setEditingField(null)
                    }}
                    className="text-xs mb-4 flex items-center gap-1 hover:underline"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    ← Back
                  </button>
                  <FieldConfigForm
                    field={editingField ?? { type: selectedType! }}
                    isNew={!editingField}
                    allSlugs={fields.map((f) => f.key)}
                    onSave={editingField ? updateField : addField}
                    onCancel={() => {
                      setMode(editingField ? "list" : "pick-type")
                      setEditingField(null)
                    }}
                  />
                </div>
              )}
            </div>

            {/* Footer — only on list mode */}
            {mode === "list" && (
              <div
                className="flex items-center justify-between px-6 py-4 border-t"
                style={{ borderColor: "var(--color-border)" }}
              >
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm rounded-lg font-medium transition-colors"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2 text-sm rounded-lg font-medium text-white transition-opacity disabled:opacity-60 flex items-center gap-2"
                  style={{ background: "var(--color-accent)" }}
                >
                  {saving ? "Saving…" : (
                    <>
                      <Check size={14} />
                      Save fields
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
