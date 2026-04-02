"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { VideoCamera, Trash, ArrowClockwise } from "@phosphor-icons/react"
import { toast } from "sonner"
import { EmptyState } from "@/components/ui/empty-state"
import { RecordButton } from "./record-button"
import { useRecorderStore } from "@/apps/recorder/stores/recorder-store"

interface Recording {
  id: string
  name: string
  status: string
  duration: number | null
  eventCount: number | null
  createdAt: string
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  recording:  { bg: "bg-rose-50",    text: "text-rose-600",    label: "Recording" },
  recorded:   { bg: "bg-emerald-50", text: "text-emerald-600", label: "Recorded" },
  processing: { bg: "bg-amber-50",   text: "text-amber-600",   label: "Processing" },
  converted:  { bg: "bg-blue-50",    text: "text-blue-600",    label: "Converted" },
  failed:     { bg: "bg-red-50",     text: "text-red-600",     label: "Failed" },
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.recorded
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  )
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

export function RecordingList() {
  const router = useRouter()
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)
  const { recording: isRecording } = useRecorderStore()

  const fetchRecordings = useCallback(() => {
    fetch("/api/recordings")
      .then((res) => res.json())
      .then((data) => setRecordings(data.recordings ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchRecordings()
  }, [fetchRecordings])

  // Refresh list when recording stops
  useEffect(() => {
    if (!isRecording) {
      const timer = setTimeout(fetchRecordings, 500)
      return () => clearTimeout(timer)
    }
  }, [isRecording, fetchRecordings])

  async function deleteRecording(id: string) {
    try {
      await fetch(`/api/recordings/${id}`, { method: "DELETE" })
      setRecordings((prev) => prev.filter((r) => r.id !== id))
      toast.success("Recording deleted")
    } catch {
      toast.error("Failed to delete recording")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[12rem]">
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Loading...
        </p>
      </div>
    )
  }

  if (recordings.length === 0) {
    return (
      <EmptyState
        icon={<VideoCamera weight="light" />}
        title="No recordings yet"
        description="Start a recording to capture your actions and convert them into automations."
        action={<RecordButton />}
      />
    )
  }

  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={fetchRecordings}
            className="flex items-center justify-center rounded-lg p-1.5 transition-colors hover:bg-[var(--color-bg-subtle)]"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            <ArrowClockwise size={16} />
          </button>
          <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {recordings.length} {recordings.length === 1 ? "recording" : "recordings"}
          </span>
        </div>
        <RecordButton />
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr
              className="border-b text-left"
              style={{
                borderColor: "var(--color-border)",
                background: "var(--color-bg-subtle)",
              }}
            >
              <th className="px-4 py-2.5 font-medium" style={{ color: "var(--color-text-secondary)" }}>Name</th>
              <th className="px-4 py-2.5 font-medium" style={{ color: "var(--color-text-secondary)" }}>Status</th>
              <th className="px-4 py-2.5 font-medium" style={{ color: "var(--color-text-secondary)" }}>Duration</th>
              <th className="px-4 py-2.5 font-medium" style={{ color: "var(--color-text-secondary)" }}>Events</th>
              <th className="px-4 py-2.5 font-medium" style={{ color: "var(--color-text-secondary)" }}>Created</th>
              <th className="px-4 py-2.5 w-10" />
            </tr>
          </thead>
          <tbody>
            {recordings.map((rec) => (
              <tr
                key={rec.id}
                className="border-b last:border-b-0 transition-colors hover:bg-[var(--color-bg-subtle)] cursor-pointer"
                style={{ borderColor: "var(--color-border)" }}
                onClick={() => router.push(`/recorder/${rec.id}`)}
              >
                <td className="px-4 py-2.5" style={{ color: "var(--color-text-primary)" }}>
                  {rec.name}
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={rec.status} />
                </td>
                <td className="px-4 py-2.5 tabular-nums" style={{ color: "var(--color-text-secondary)" }}>
                  {formatDuration(rec.duration)}
                </td>
                <td className="px-4 py-2.5 tabular-nums" style={{ color: "var(--color-text-secondary)" }}>
                  {rec.eventCount ?? "—"}
                </td>
                <td className="px-4 py-2.5" style={{ color: "var(--color-text-secondary)" }}>
                  {new Date(rec.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-2.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteRecording(rec.id) }}
                    className="flex items-center justify-center rounded-lg p-1.5 transition-colors hover:bg-red-50"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    <Trash size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
