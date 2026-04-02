"use client"

import { useEffect, useState } from "react"
import { Stop } from "@phosphor-icons/react"
import { useRecorderStore } from "@/apps/recorder/stores/recorder-store"

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function RecordingOverlay() {
  const { recording, eventCount, startedAt, stopRecording } = useRecorderStore()
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!recording || !startedAt) {
      setElapsed(0)
      return
    }
    const tick = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
    return () => clearInterval(tick)
  }, [recording, startedAt])

  if (!recording) return null

  return (
    <div
      className="fixed bottom-5 right-5 z-[9999] flex items-center gap-3 rounded-xl px-4 py-2.5 shadow-lg border"
      style={{
        background: "var(--color-bg-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* Pulsing red dot */}
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
      </span>

      <span
        className="text-sm font-medium tabular-nums"
        style={{ color: "var(--color-text-primary)" }}
      >
        {formatDuration(elapsed)}
      </span>

      <span
        className="text-sm"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {eventCount} {eventCount === 1 ? "event" : "events"}
      </span>

      <button
        onClick={() => stopRecording()}
        className="ml-1 flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 transition-colors"
      >
        <Stop size={14} weight="fill" />
        Stop
      </button>
    </div>
  )
}
