"use client"

import { useEffect, useState } from "react"
import { VideoCamera } from "@phosphor-icons/react"
import { EmptyState } from "@/components/ui/empty-state"

interface Recording {
  id: string
  name: string
  status: string
  duration: number | null
  eventCount: number | null
  createdAt: string
}

export function RecordingList() {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/recordings")
      .then((res) => res.json())
      .then((data) => {
        setRecordings(data.recordings ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

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
        action={
          <button
            className="rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ background: "var(--color-accent)" }}
          >
            Start Recording
          </button>
        }
      />
    )
  }

  return (
    <div className="px-6 py-4">
      <table className="w-full text-sm">
        <thead>
          <tr
            className="border-b text-left"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
          >
            <th className="pb-2 font-medium">Name</th>
            <th className="pb-2 font-medium">Status</th>
            <th className="pb-2 font-medium">Duration</th>
            <th className="pb-2 font-medium">Events</th>
            <th className="pb-2 font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {recordings.map((rec) => (
            <tr
              key={rec.id}
              className="border-b"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
            >
              <td className="py-2">{rec.name}</td>
              <td className="py-2 capitalize">{rec.status}</td>
              <td className="py-2">{rec.duration ? `${rec.duration}s` : "—"}</td>
              <td className="py-2">{rec.eventCount ?? "—"}</td>
              <td className="py-2">{new Date(rec.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
