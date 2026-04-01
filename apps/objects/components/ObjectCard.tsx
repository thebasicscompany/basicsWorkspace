"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Sliders, Trash, Lock } from "@phosphor-icons/react"
import { toast } from "sonner"
import { OBJECT_ICON_MAP, colorToHex } from "@/apps/objects/icons"
import { FieldBuilderModal } from "@/apps/objects/components/FieldBuilderModal"
import { ConfirmDialog } from "@/components/confirm-dialog"
import type { ObjectConfig } from "@/apps/objects/hooks/useObjectConfig"

export function ObjectCard({
  config,
  onDeleted,
  onFieldsSaved,
}: {
  config: ObjectConfig
  onDeleted?: () => void
  onFieldsSaved?: () => void
}) {
  const router = useRouter()
  const [fieldsOpen, setFieldsOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const Icon = OBJECT_ICON_MAP[config.icon] ?? OBJECT_ICON_MAP["Cube"]
  const hex = colorToHex(config.color)
  const fieldCount = config.fields.length

  async function handleDelete() {
    setDeleting(true)
    try {
      await fetch(`/api/objects/${config.slug}`, { method: "DELETE" })
      toast.success(`"${config.name}" deleted`)
      onDeleted?.()
    } catch {
      toast.error("Failed to delete object")
      setDeleting(false)
    }
  }

  return (
    <>
      <div
        onClick={() => router.push(`/objects/${config.slug}`)}
        className="group relative flex flex-col rounded-xl cursor-pointer transition-all"
        style={{
          background: "var(--color-bg-surface)",
          border: "1px solid var(--color-border)",
          padding: "16px",
          gap: 12,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = hex)}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
      >
        {/* Icon + system badge */}
        <div className="flex items-start justify-between">
          <div
            className="flex items-center justify-center rounded-xl"
            style={{ width: 44, height: 44, background: hex + "18" }}
          >
            <Icon size={22} weight="fill" style={{ color: hex }} />
          </div>
          {config.isSystem && (
            <span
              className="flex items-center gap-1 rounded-full px-2"
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: "var(--color-text-tertiary)",
                background: "var(--color-bg-base)",
                border: "1px solid var(--color-border)",
                height: 20,
                letterSpacing: "0.03em",
              }}
            >
              <Lock size={9} />
              System
            </span>
          )}
        </div>

        {/* Name + field count */}
        <div className="flex flex-col gap-0.5">
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>
            {config.namePlural}
          </span>
          <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
            {fieldCount === 0 ? "No fields" : `${fieldCount} field${fieldCount === 1 ? "" : "s"}`}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 mt-auto">
          <button
            onClick={(e) => { e.stopPropagation(); setFieldsOpen(true) }}
            className="flex items-center gap-1.5 rounded-lg px-2.5 transition-colors"
            style={{
              height: 28,
              fontSize: 12,
              color: "var(--color-text-secondary)",
              background: "var(--color-bg-base)",
              border: "1px solid var(--color-border)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-sidebar)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-bg-base)")}
          >
            <Sliders size={12} />
            Fields
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); router.push(`/objects/${config.slug}`) }}
            className="flex items-center gap-1.5 rounded-lg px-2.5 transition-colors"
            style={{
              height: 28,
              fontSize: 12,
              color: "var(--color-text-secondary)",
              background: "var(--color-bg-base)",
              border: "1px solid var(--color-border)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-sidebar)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-bg-base)")}
          >
            {!config.isSystem && <ArrowRight size={12} />}
            View records
          </button>

          {!config.isSystem && (
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmOpen(true) }}
              disabled={deleting}
              className="flex items-center justify-center rounded-lg ml-auto transition-colors"
              style={{
                width: 28,
                height: 28,
                color: "var(--color-text-tertiary)",
                background: "var(--color-bg-base)",
                border: "1px solid var(--color-border)",
                opacity: deleting ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#EF4444"
                e.currentTarget.style.borderColor = "#FCA5A5"
                e.currentTarget.style.background = "#FEF2F2"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--color-text-tertiary)"
                e.currentTarget.style.borderColor = "var(--color-border)"
                e.currentTarget.style.background = "var(--color-bg-base)"
              }}
            >
              <Trash size={13} />
            </button>
          )}
        </div>
      </div>

      <FieldBuilderModal
        open={fieldsOpen}
        onOpenChange={setFieldsOpen}
        config={config}
        onSaved={() => { setFieldsOpen(false); onFieldsSaved?.() }}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete "${config.name}"`}
        description="This will permanently delete this object type and all its records. This action cannot be undone."
        onConfirm={handleDelete}
      />
    </>
  )
}
