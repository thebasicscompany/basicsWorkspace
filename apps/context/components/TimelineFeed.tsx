"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  AddressBook, Buildings, CurrencyDollar, CheckSquare,
  Note, VideoCamera, Lightning, Robot, ArrowRight, Funnel,
} from "@phosphor-icons/react"

// ─── Types ────────────────────────────────────────────────────────────────────

type ContextEvent = {
  id: string
  sourceApp: string
  eventType: string
  entityType: string
  entityId: string
  entityName: string | null
  createdAt: string
}

// ─── Config ───────────────────────────────────────────────────────────────────

const SOURCE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  contacts:    { label: "CRM",         icon: AddressBook,    color: "#2563EB" },
  companies:   { label: "CRM",         icon: Buildings,      color: "#2563EB" },
  deals:       { label: "CRM",         icon: CurrencyDollar, color: "#2563EB" },
  tasks:       { label: "Tasks",       icon: CheckSquare,    color: "#F59E0B" },
  notes:       { label: "Notes",       icon: Note,           color: "#8B5CF6" },
  meetings:    { label: "Meetings",    icon: VideoCamera,    color: "#3B82F6" },
  automations: { label: "Automations", icon: Lightning,      color: "#6366F1" },
  agent:       { label: "Agent",       icon: Robot,          color: "#EC4899" },
}

const ENTITY_ROUTES: Record<string, string> = {
  contacts:  "/crm/contacts",
  companies: "/crm/companies",
  deals:     "/crm/deals",
}

function formatEventType(raw: string) {
  const [, action] = raw.split(".")
  if (!action) return raw
  return action.charAt(0).toUpperCase() + action.slice(1).replace(/_/g, " ")
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

const ALL_SOURCES = Object.keys(SOURCE_CONFIG)

// ─── Component ────────────────────────────────────────────────────────────────

export function TimelineFeed() {
  const router = useRouter()
  const [events, setEvents] = useState<ContextEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [sourceFilter, setSourceFilter] = useState<string | null>(null)
  const loaderRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async (reset = false) => {
    if (!hasMore && !reset) return
    setLoading(true)
    try {
      const qs = new URLSearchParams({ limit: "50" })
      if (!reset && cursor) qs.set("cursor", cursor)
      if (sourceFilter) qs.set("source_app", sourceFilter)
      const res = await fetch(`/api/context/events?${qs}`)
      if (!res.ok) throw new Error()
      const json = await res.json() as { events: ContextEvent[]; nextCursor: string | null }
      setEvents((prev) => reset ? json.events : [...prev, ...json.events])
      setCursor(json.nextCursor)
      setHasMore(json.nextCursor !== null)
    } finally {
      setLoading(false)
    }
  }, [cursor, hasMore, sourceFilter])

  // Load on mount and when filter changes
  useEffect(() => {
    setCursor(null)
    setHasMore(true)
    setEvents([])
    setLoading(true)
    const qs = new URLSearchParams({ limit: "50" })
    if (sourceFilter) qs.set("source_app", sourceFilter)
    fetch(`/api/context/events?${qs}`)
      .then((r) => r.json())
      .then((json: { events: ContextEvent[]; nextCursor: string | null }) => {
        setEvents(json.events)
        setCursor(json.nextCursor)
        setHasMore(json.nextCursor !== null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sourceFilter])

  // Infinite scroll observer
  useEffect(() => {
    const el = loaderRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !loading && hasMore) load() },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [load, loading, hasMore])

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Section label */}
      <div
        className="flex items-center gap-2 px-4 border-b shrink-0"
        style={{ height: 32, borderColor: "var(--color-border)" }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-tertiary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Recent Activity
        </span>
      </div>

      {/* Filter bar */}
      <div
        className="flex items-center gap-1 px-4 border-b shrink-0 overflow-x-auto"
        style={{ height: 36, borderColor: "var(--color-border)" }}
      >
        <Funnel size={12} style={{ color: "var(--color-text-tertiary)", flexShrink: 0, marginRight: 4 }} />
        <FilterChip label="All" active={sourceFilter === null} onClick={() => setSourceFilter(null)} />
        {ALL_SOURCES.map((src) => (
          <FilterChip
            key={src}
            label={SOURCE_CONFIG[src].label}
            active={sourceFilter === src}
            color={SOURCE_CONFIG[src].color}
            onClick={() => setSourceFilter(sourceFilter === src ? null : src)}
          />
        ))}
      </div>

      {/* Event list — same visual language as RecordTable */}
      <div className="flex-1 overflow-y-auto" style={{ background: "var(--color-bg-surface)" }}>

        {/* Header row */}
        <div
          className="flex items-center sticky top-0 border-b"
          style={{ height: 32, background: "var(--color-bg-surface)", borderColor: "var(--color-border)", zIndex: 2 }}
        >
          <div className="w-8 shrink-0" />
          <div className="flex-1 px-2" style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)" }}>Event</div>
          <div className="w-40 px-2 shrink-0" style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)" }}>Record</div>
          <div className="w-24 px-2 shrink-0" style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)" }}>Source</div>
          <div className="w-24 px-2 shrink-0 text-right" style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)" }}>When</div>
          <div className="w-8 shrink-0" />
        </div>

        {loading && events.length === 0 ? (
          Array.from({ length: 12 }).map((_, i) => <SkeletonRow key={i} />)
        ) : events.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <span style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>No events yet</span>
          </div>
        ) : (
          <>
            {events.map((evt) => (
              <EventRow
                key={evt.id}
                event={evt}
                onNavigate={() => {
                  const base = ENTITY_ROUTES[evt.entityType]
                  if (base) router.push(`${base}/${evt.entityId}`)
                }}
              />
            ))}
            <div ref={loaderRef} className="h-8 flex items-center justify-center">
              {loading && <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>Loading…</span>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Event row ────────────────────────────────────────────────────────────────

function EventRow({ event, onNavigate }: { event: ContextEvent; onNavigate: () => void }) {
  const [hovered, setHovered] = useState(false)
  const cfg = SOURCE_CONFIG[event.sourceApp] ?? SOURCE_CONFIG.agent
  const Icon = cfg.icon
  const canNavigate = !!ENTITY_ROUTES[event.entityType]

  return (
    <div
      className="flex items-center border-b cursor-default group"
      style={{
        height: 32,
        borderColor: "var(--color-border)",
        background: hovered ? "var(--color-bg-subtle)" : "var(--color-bg-surface)",
        transition: "background 0.08s ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* App icon dot */}
      <div className="w-8 shrink-0 flex items-center justify-center">
        <div
          className="rounded-full flex items-center justify-center"
          style={{ width: 20, height: 20, background: cfg.color + "20" }}
        >
          <Icon size={11} style={{ color: cfg.color }} />
        </div>
      </div>

      {/* Event type */}
      <div className="flex-1 px-2 min-w-0">
        <span className="truncate" style={{ fontSize: 13, color: "var(--color-text-primary)" }}>
          {formatEventType(event.eventType)}
        </span>
      </div>

      {/* Entity name */}
      <div className="w-40 px-2 shrink-0 min-w-0">
        <span className="truncate block" style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
          {event.entityName ?? "—"}
        </span>
      </div>

      {/* Source label */}
      <div className="w-24 px-2 shrink-0">
        <span style={{ fontSize: 11, color: cfg.color, fontWeight: 500 }}>{cfg.label}</span>
      </div>

      {/* Timestamp */}
      <div className="w-24 px-2 shrink-0 text-right">
        <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
          {relativeTime(event.createdAt)}
        </span>
      </div>

      {/* Navigate arrow */}
      <div className="w-8 shrink-0 flex items-center justify-center">
        {canNavigate && hovered && (
          <button
            onClick={onNavigate}
            className="flex items-center justify-center rounded transition-colors"
            style={{ width: 20, height: 20, color: "var(--color-text-tertiary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-border)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <ArrowRight size={11} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center border-b" style={{ height: 32, borderColor: "var(--color-border)" }}>
      <div className="w-8 shrink-0 flex items-center justify-center">
        <div className="rounded-full animate-pulse" style={{ width: 20, height: 20, background: "var(--color-border)" }} />
      </div>
      <div className="flex-1 px-2">
        <div className="h-2.5 rounded-full animate-pulse" style={{ width: "45%", background: "var(--color-border)" }} />
      </div>
      <div className="w-40 px-2 shrink-0">
        <div className="h-2.5 rounded-full animate-pulse" style={{ width: "70%", background: "var(--color-border)" }} />
      </div>
      <div className="w-24 px-2 shrink-0">
        <div className="h-2.5 rounded-full animate-pulse" style={{ width: "50%", background: "var(--color-border)" }} />
      </div>
      <div className="w-24 px-2 shrink-0 flex justify-end">
        <div className="h-2.5 rounded-full animate-pulse" style={{ width: "60%", background: "var(--color-border)" }} />
      </div>
      <div className="w-8 shrink-0" />
    </div>
  )
}

// ─── Filter chip ──────────────────────────────────────────────────────────────

function FilterChip({ label, active, color, onClick }: { label: string; active: boolean; color?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center px-2.5 rounded-full shrink-0 transition-colors"
      style={{
        height: 22,
        fontSize: 11,
        fontWeight: 500,
        background: active ? (color ? color + "20" : "var(--color-accent-light)") : "transparent",
        color: active ? (color ?? "var(--color-accent)") : "var(--color-text-tertiary)",
        border: `1px solid ${active ? (color ?? "var(--color-accent)") + "40" : "transparent"}`,
      }}
    >
      {label}
    </button>
  )
}
