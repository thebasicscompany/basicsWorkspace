"use client"

import { useState } from "react"
import { Plus } from "@phosphor-icons/react"
import { AppHeader } from "@/components/app-header"
import { PageTransition } from "@/components/page-transition"
import { SectionLabel } from "@/components/section-label"
import { ObjectCard } from "@/apps/objects/components/ObjectCard"
import { NewObjectDialog } from "@/apps/objects/components/NewObjectDialog"
import { useObjectConfigs } from "@/apps/objects/hooks/useObjectConfigs"

export default function ObjectsPage() {
  const { configs, loading, refetch } = useObjectConfigs()
  const [newOpen, setNewOpen] = useState(false)

  const custom = configs.filter((c) => !c.isSystem)
  const system = configs.filter((c) => c.isSystem)

  return (
    <>
      <AppHeader
        breadcrumb={[{ label: "Workspace", href: "/" }, { label: "Objects" }]}
        actions={
          <button
            onClick={() => setNewOpen(true)}
            className="flex items-center gap-1.5 px-2.5 h-7 rounded text-xs font-medium transition-colors"
            style={{ color: "var(--color-text-secondary)", background: "transparent" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-subtle)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Plus size={14} />
            New object type
          </button>
        }
      />

      <PageTransition>
        <div
          className="flex flex-col overflow-y-auto"
          style={{ height: "calc(100vh - 48px)", background: "var(--color-bg-base)", padding: "28px 32px" }}
        >
          {/* Custom objects */}
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>Custom Objects</SectionLabel>
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
              {!loading && `${custom.length} object${custom.length === 1 ? "" : "s"}`}
            </span>
          </div>

          {loading ? (
            <SkeletonGrid />
          ) : custom.length === 0 ? (
            <EmptyCustom onNew={() => setNewOpen(true)} />
          ) : (
            <div className="grid gap-3 mb-10" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
              {custom.map((c) => (
                <ObjectCard key={c.id} config={c} onDeleted={refetch} onFieldsSaved={refetch} />
              ))}
            </div>
          )}

          {/* System objects */}
          {!loading && system.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-3 mt-6">
                <SectionLabel>System Objects</SectionLabel>
                <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                  {system.length} built-in
                </span>
              </div>
              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
                {system.map((c) => (
                  <ObjectCard key={c.id} config={c} onFieldsSaved={refetch} />
                ))}
              </div>
            </>
          )}
        </div>
      </PageTransition>

      <NewObjectDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={refetch}
      />
    </>
  )
}

function EmptyCustom({ onNew }: { onNew: () => void }) {
  return (
    <button
      onClick={onNew}
      className="flex flex-col items-center justify-center rounded-xl transition-colors mb-10"
      style={{
        height: 160,
        border: "1.5px dashed var(--color-border)",
        background: "transparent",
        color: "var(--color-text-tertiary)",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-surface)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <Plus size={20} style={{ marginBottom: 8, color: "var(--color-accent)" }} />
      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)" }}>
        Create your first custom object
      </span>
      <span style={{ fontSize: 12, marginTop: 4 }}>
        Like a CRM for anything — vendors, properties, campaigns…
      </span>
    </button>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid gap-3 mb-10" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl animate-pulse"
          style={{ height: 140, background: "var(--color-border)" }}
        />
      ))}
    </div>
  )
}
