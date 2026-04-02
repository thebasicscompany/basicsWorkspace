"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Lightning, ArrowLeft, SpinnerGap } from "@phosphor-icons/react"
import { toast } from "sonner"
import { PageTransition } from "@/components/page-transition"
import { AppHeader } from "@/components/app-header"
import { ActionTimeline } from "@/apps/recorder/components/action-timeline"
import { Button } from "@/components/ui/button"

interface Recording {
  id: string
  name: string
  status: string
  duration: number | null
  eventCount: number | null
  events: unknown[] | null
  structuredActions: unknown[] | null
  createdAt: string
}

interface UnderstoodAction {
  step: number
  action: string
  element: string
  app: string
  value: string
  confidence: "high" | "medium" | "low"
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  recording:  { bg: "bg-rose-50",    text: "text-rose-600",    label: "Recording" },
  recorded:   { bg: "bg-emerald-50", text: "text-emerald-600", label: "Recorded" },
  processing: { bg: "bg-amber-50",   text: "text-amber-600",   label: "Processing" },
  converted:  { bg: "bg-blue-50",    text: "text-blue-600",    label: "Understood" },
  failed:     { bg: "bg-red-50",     text: "text-red-600",     label: "Failed" },
}

export default function RecordingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [recording, setRecording] = useState<Recording | null>(null)
  const [loading, setLoading] = useState(true)
  const [understanding, setUnderstanding] = useState(false)

  const fetchRecording = useCallback(() => {
    fetch(`/api/recordings/${id}`)
      .then((res) => res.json())
      .then((data) => setRecording(data.recording ?? null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    fetchRecording()
  }, [fetchRecording])

  async function handleUnderstand() {
    setUnderstanding(true)
    try {
      const res = await fetch(`/api/recordings/${id}/understand`, { method: "POST" })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || "Understanding failed")
        return
      }
      toast.success("Recording understood")
      fetchRecording()
    } catch {
      toast.error("Understanding failed")
    } finally {
      setUnderstanding(false)
    }
  }

  if (loading) {
    return (
      <>
        <AppHeader
          breadcrumb={[
            { label: "Workspace", href: "/" },
            { label: "Recorder", href: "/recorder" },
            { label: "Loading..." },
          ]}
        />
        <PageTransition>
          <div
            className="flex items-center justify-center min-h-[12rem]"
            style={{ background: "var(--color-bg-base)" }}
          >
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Loading...</p>
          </div>
        </PageTransition>
      </>
    )
  }

  if (!recording) {
    return (
      <>
        <AppHeader
          breadcrumb={[
            { label: "Workspace", href: "/" },
            { label: "Recorder", href: "/recorder" },
            { label: "Not Found" },
          ]}
        />
        <PageTransition>
          <div
            className="flex items-center justify-center min-h-[12rem]"
            style={{ background: "var(--color-bg-base)" }}
          >
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Recording not found.</p>
          </div>
        </PageTransition>
      </>
    )
  }

  const status = STATUS_STYLES[recording.status] ?? STATUS_STYLES.recorded
  const actions = (recording.structuredActions as UnderstoodAction[]) ?? []
  const hasEvents = (recording.eventCount ?? 0) > 0
  const canUnderstand = hasEvents && recording.status === "recorded"

  return (
    <>
      <AppHeader
        breadcrumb={[
          { label: "Workspace", href: "/" },
          { label: "Recorder", href: "/recorder" },
          { label: recording.name },
        ]}
      />
      <PageTransition>
        <div style={{ background: "var(--color-bg-base)" }}>
          {/* Header bar */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/recorder")}
                className="flex items-center justify-center rounded-lg p-1.5 transition-colors hover:bg-[var(--color-bg-subtle)]"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2
                  className="text-sm font-semibold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {recording.name}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${status.bg} ${status.text}`}>
                    {status.label}
                  </span>
                  {recording.duration !== null && (
                    <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                      {recording.duration}s
                    </span>
                  )}
                  {recording.eventCount !== null && (
                    <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                      {recording.eventCount} events
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canUnderstand && (
                <Button
                  variant="default"
                  size="default"
                  onClick={handleUnderstand}
                  disabled={understanding}
                >
                  {understanding ? (
                    <SpinnerGap size={16} className="animate-spin" />
                  ) : (
                    <Lightning size={16} weight="fill" />
                  )}
                  {understanding ? "Understanding..." : "Understand"}
                </Button>
              )}
            </div>
          </div>

          {/* Action timeline */}
          {actions.length > 0 ? (
            <ActionTimeline actions={actions} />
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[16rem] gap-2">
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {recording.status === "processing"
                  ? "Processing recording..."
                  : hasEvents
                    ? "Click \"Understand\" to analyze the recorded actions."
                    : "No events captured in this recording."}
              </p>
            </div>
          )}
        </div>
      </PageTransition>
    </>
  )
}
