"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import { PageTransition } from "@/components/page-transition"
import type { ApiRecord } from "@/apps/crm/types"
import {
  Clock,
  ArrowLeft,
  User,
  Buildings,
  CurrencyDollar,
  Pencil,
  Trash,
} from "@phosphor-icons/react"

// ─── Types ────────────────────────────────────────────────────────────────────

type ContextEvent = {
  id: string
  sourceApp: string
  eventType: string
  entityName: string | null
  createdAt: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, { singular: string; plural: string; href: string }> = {
  contacts:  { singular: "Contact",  plural: "Contacts",  href: "/crm/contacts" },
  companies: { singular: "Company",  plural: "Companies", href: "/crm/companies" },
  deals:     { singular: "Deal",     plural: "Deals",     href: "/crm/deals" },
}

function formatEventType(raw: string) {
  return raw.replace(/\./g, " › ").replace(/_/g, " ")
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

const SOURCE_COLORS: Record<string, string> = {
  contacts:    "#2563EB",
  companies:   "#2563EB",
  deals:       "#2563EB",
  tasks:       "#F59E0B",
  automations: "#6366F1",
  meetings:    "#3B82F6",
  notes:       "#8B5CF6",
  agent:       "#EC4899",
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RecordDetail({ type, id }: { type: string; id: string }) {
  const router = useRouter()
  const meta = TYPE_LABELS[type] ?? { singular: type, plural: type, href: `/crm/${type}` }

  const [record, setRecord] = useState<ApiRecord | null>(null)
  const [events, setEvents] = useState<ContextEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [recRes, evtRes] = await Promise.all([
          fetch(`/api/records/${id}`),
          fetch(`/api/context/events?entity_id=${id}&limit=30`),
        ])
        if (recRes.ok) {
          const j = await recRes.json()
          setRecord(j.record)
        }
        if (evtRes.ok) {
          const j = await evtRes.json()
          setEvents(j.events ?? [])
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const fields = record ? Object.entries(record.data).filter(([k]) => k !== "id") : []

  const displayName = record
    ? (String(record.data.name ?? "") ||
       [String(record.data.firstName ?? ""), String(record.data.lastName ?? "")].filter(Boolean).join(" ") ||
       id)
    : "…"

  return (
    <>
      <AppHeader
        breadcrumb={[
          { label: "Workspace", href: "/" },
          { label: "CRM", href: "/crm" },
          { label: meta.plural, href: meta.href },
          { label: loading ? "…" : displayName },
        ]}
      />
      <PageTransition>
        <div className="flex flex-col" style={{ minHeight: "calc(100vh - 48px)", background: "var(--color-bg-base)" }}>

          {loading ? (
            <div className="flex items-center justify-center flex-1 py-24">
              <span style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>Loading…</span>
            </div>
          ) : !record ? (
            <div className="flex flex-col items-center justify-center flex-1 py-24 gap-3">
              <span style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>Record not found</span>
              <button onClick={() => router.push(meta.href)} style={{ fontSize: 12, color: "var(--color-accent)" }}>
                ← Back to {meta.plural}
              </button>
            </div>
          ) : (
            <div className="flex gap-6 p-6 flex-1 min-h-0">

              {/* ── Left: Fields ── */}
              <div className="flex flex-col gap-4 flex-1 min-w-0">
                <div
                  className="rounded-xl border"
                  style={{ background: "var(--color-bg-surface)", borderColor: "var(--color-border)" }}
                >
                  {/* Record header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
                    <h1 className="font-semibold" style={{ fontSize: 16, color: "var(--color-text-primary)" }}>
                      {displayName}
                    </h1>
                    <div className="flex items-center gap-1">
                      <IconButton icon={<Pencil size={13} />} label="Edit" />
                      <IconButton icon={<Trash size={13} />} label="Delete" />
                    </div>
                  </div>

                  {/* Fields grid */}
                  <div className="grid grid-cols-2 gap-0">
                    {fields.map(([key, value], i) => (
                      <div
                        key={key}
                        className="px-5 py-3 border-b border-r"
                        style={{
                          borderColor: "var(--color-border)",
                          borderRight: i % 2 === 0 ? `1px solid var(--color-border)` : "none",
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          {key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()}
                        </div>
                        <div style={{ fontSize: 13, color: "var(--color-text-primary)" }}>
                          {value != null && String(value) !== "" ? String(value) : (
                            <span style={{ color: "var(--color-text-tertiary)" }}>—</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Right: Timeline ── */}
              <div
                className="flex flex-col rounded-xl border shrink-0"
                style={{ width: 320, background: "var(--color-bg-surface)", borderColor: "var(--color-border)" }}
              >
                <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
                  <Clock size={13} style={{ color: "var(--color-text-tertiary)" }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>Activity</span>
                </div>

                {events.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>No activity yet</span>
                  </div>
                ) : (
                  <div className="flex flex-col overflow-y-auto flex-1">
                    {events.map((evt) => (
                      <div
                        key={evt.id}
                        className="flex items-start gap-3 px-4 py-3 border-b"
                        style={{ borderColor: "var(--color-border)" }}
                      >
                        <div
                          className="rounded-full shrink-0 mt-0.5"
                          style={{
                            width: 8,
                            height: 8,
                            marginTop: 5,
                            background: SOURCE_COLORS[evt.sourceApp] ?? "var(--color-text-tertiary)",
                          }}
                        />
                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                          <span style={{ fontSize: 12, color: "var(--color-text-primary)" }}>
                            {formatEventType(evt.eventType)}
                          </span>
                          {evt.entityName && (
                            <span className="truncate" style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                              {evt.entityName}
                            </span>
                          )}
                        </div>
                        <span className="shrink-0" style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                          {relativeTime(evt.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </PageTransition>
    </>
  )
}

function IconButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      title={label}
      className="flex items-center justify-center rounded transition-colors"
      style={{ width: 28, height: 28, color: "var(--color-text-tertiary)" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-subtle)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {icon}
    </button>
  )
}
