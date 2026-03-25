"use client"

import { useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import { PageTransition } from "@/components/page-transition"
import { ObjectRecordTable } from "@/apps/objects/components/ObjectRecordTable"
import { FieldBuilderModal } from "@/apps/objects/components/FieldBuilderModal"
import { NewRecordDialog } from "@/apps/objects/components/NewRecordDialog"
import { useObjectConfig, type ObjectConfig } from "@/apps/objects/hooks/useObjectConfig"
import { useRecords } from "@/apps/crm/hooks/useRecords"
import type { ApiRecord } from "@/apps/crm/types"
import { Sliders, Plus } from "@phosphor-icons/react"

const identity = (r: ApiRecord) => r

export default function ObjectPage() {
  const params = useParams()
  const slug = params.slug as string

  const { config, loading: configLoading, refetch: refetchConfig } = useObjectConfig(slug)
  const { data: records, loading: recordsLoading, refetch: refetchRecords } = useRecords(slug, identity)
  const [fieldsOpen, setFieldsOpen] = useState(false)
  const [newRecordOpen, setNewRecordOpen] = useState(false)

  const handleFieldsSaved = useCallback(
    (_updated: ObjectConfig) => { refetchConfig() },
    [refetchConfig]
  )

  const handleCellEdit = useCallback(async (rowId: string, key: string, value: unknown) => {
    await fetch(`/api/records/${rowId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    })
  }, [])

  const isLoading = configLoading || recordsLoading
  const namePlural = config?.namePlural ?? slug

  return (
    <>
      <AppHeader
        breadcrumb={[
          { label: "Workspace", href: "/" },
          { label: "Objects", href: "/objects" },
          { label: namePlural },
        ]}
        actions={
          <div className="flex items-center gap-1">
            <HeaderButton
              icon={<Plus size={14} />}
              label={`New ${config?.name ?? "record"}`}
              onClick={() => setNewRecordOpen(true)}
            />
            <HeaderButton
              icon={<Sliders size={14} />}
              label="Fields"
              onClick={() => setFieldsOpen(true)}
            />
          </div>
        }
      />
      <PageTransition>
        <div
          className="flex flex-col"
          style={{ height: "calc(100vh - 48px)", background: "var(--color-bg-surface)" }}
        >
          <div
            className="flex items-center px-4 shrink-0 border-b"
            style={{ height: 40, borderColor: "var(--color-border)" }}
          >
            <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
              {isLoading
                ? "Loading…"
                : `${records.length} ${namePlural.toLowerCase()}`}
            </span>
          </div>
          <ObjectRecordTable
            fields={config?.fields ?? []}
            records={records}
            isLoading={isLoading}
            onAddRow={() => setNewRecordOpen(true)}
            onCellEdit={handleCellEdit}
          />
        </div>
      </PageTransition>

      {config && (
        <>
          <FieldBuilderModal
            open={fieldsOpen}
            onOpenChange={setFieldsOpen}
            config={config}
            onSaved={handleFieldsSaved}
          />
          <NewRecordDialog
            open={newRecordOpen}
            onOpenChange={setNewRecordOpen}
            config={config}
            onCreated={refetchRecords}
          />
        </>
      )}
    </>
  )
}

function HeaderButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 h-7 rounded text-xs font-medium transition-colors"
      style={{ color: "var(--color-text-secondary)", background: "transparent" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-subtle)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {icon}
      {label}
    </button>
  )
}
