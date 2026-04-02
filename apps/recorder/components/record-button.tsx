"use client"

import { useState } from "react"
import { Record, Stop } from "@phosphor-icons/react"
import { toast } from "sonner"
import { useRecorderStore } from "@/apps/recorder/stores/recorder-store"
import { Button } from "@/components/ui/button"

export function RecordButton() {
  const { recording, startRecording, stopRecording } = useRecorderStore()
  const [busy, setBusy] = useState(false)

  async function handleStart() {
    setBusy(true)
    try {
      const bridge = (window as unknown as Record<string, unknown>).recorder
      console.log("[recorder] bridge exists:", !!bridge)

      // Create recording in the DB first
      const res = await fetch("/api/recordings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Recording ${new Date().toLocaleString()}` }),
      })
      console.log("[recorder] POST /api/recordings status:", res.status)
      if (!res.ok) {
        const err = await res.text()
        console.error("[recorder] POST error:", err)
        toast.error("Failed to create recording")
        return
      }
      const { recording: rec } = await res.json()
      console.log("[recorder] created recording:", rec.id)
      await startRecording(rec.id)
      console.log("[recorder] startRecording called")
      toast.success("Recording started")
    } catch (err) {
      console.error("[recorder] handleStart error:", err)
      toast.error("Failed to start recording")
    } finally {
      setBusy(false)
    }
  }

  async function handleStop() {
    setBusy(true)
    try {
      const sessionId = useRecorderStore.getState().sessionId
      const result = await stopRecording()
      if (result && sessionId) {
        // Save events back to the DB
        await fetch(`/api/recordings/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "recorded",
            events: result.events,
            duration: result.duration,
            eventCount: result.events.length,
          }),
        })
        toast.success(`Recording saved — ${result.events.length} events captured`)
      }
    } catch {
      toast.error("Failed to stop recording")
    } finally {
      setBusy(false)
    }
  }

  if (recording) {
    return (
      <Button
        variant="destructive"
        size="default"
        onClick={handleStop}
        disabled={busy}
      >
        <Stop size={16} weight="fill" />
        Stop Recording
      </Button>
    )
  }

  return (
    <Button
      variant="default"
      size="default"
      onClick={handleStart}
      disabled={busy}
      className="bg-rose-500 hover:bg-rose-600 text-white"
    >
      <Record size={16} weight="fill" />
      Start Recording
    </Button>
  )
}
