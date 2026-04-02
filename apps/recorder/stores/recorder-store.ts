"use client"

import { create } from "zustand"

interface RecorderEvent {
  timestamp: number
  type: "click" | "keyInput" | "windowSwitch" | "scroll" | "clipboard"
  coordinates?: { x: number; y: number }
  textEntered?: string
  windowTitle?: string
  appName?: string
}

interface RecorderStore {
  recording: boolean
  sessionId: string | null
  eventCount: number
  startedAt: number | null
  events: RecorderEvent[]

  startRecording: (sessionId: string) => Promise<void>
  stopRecording: () => Promise<{ events: unknown[]; duration: number } | null>
  addEvent: (event: RecorderEvent) => void
  reset: () => void
}

interface RecorderBridge {
  startRecording: (sessionId: string) => Promise<{ ok: boolean }>
  stopRecording: () => Promise<{ events: unknown[]; duration: number }>
  getStatus: () => Promise<{ recording: boolean; sessionId: string | null; eventCount: number; startedAt: number | null }>
  onEvent: (cb: (event: RecorderEvent) => void) => () => void
  onStopped: (cb: (result: { events: unknown[]; duration: number }) => void) => () => void
}

function getRecorderBridge(): RecorderBridge | null {
  if (typeof window === "undefined") return null
  return (window as unknown as Record<string, unknown>).recorder as RecorderBridge
}

export const useRecorderStore = create<RecorderStore>((set, get) => ({
  recording: false,
  sessionId: null,
  eventCount: 0,
  startedAt: null,
  events: [],

  startRecording: async (sessionId: string) => {
    const bridge = getRecorderBridge()
    if (!bridge) {
      console.error("[recorder-store] No Electron bridge found")
      return
    }

    console.log("[recorder-store] calling bridge.startRecording", sessionId)
    const result = await bridge.startRecording(sessionId)
    console.log("[recorder-store] bridge result:", result)

    if (result.ok) {
      set({
        recording: true,
        sessionId,
        eventCount: 0,
        startedAt: Date.now(),
        events: [],
      })

      bridge.onEvent((event: RecorderEvent) => {
        get().addEvent(event)
      })

      // Listen for stop from overlay pill — save events to DB and reset state
      bridge.onStopped(async (result: { events: unknown[]; duration: number }) => {
        const sid = get().sessionId
        if (sid && result.events.length > 0) {
          await fetch(`/api/recordings/${sid}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: "recorded",
              events: result.events,
              duration: result.duration,
              eventCount: result.events.length,
            }),
          })
        }
        set({
          recording: false,
          sessionId: null,
          eventCount: 0,
          startedAt: null,
          events: [],
        })
      })
    }
  },

  stopRecording: async () => {
    const bridge = getRecorderBridge()
    if (!bridge) return null

    const result = await bridge.stopRecording()
    set({
      recording: false,
      sessionId: null,
      eventCount: 0,
      startedAt: null,
      events: [],
    })
    return result
  },

  addEvent: (event: RecorderEvent) => {
    set((state) => ({
      events: [...state.events, event],
      eventCount: state.eventCount + 1,
    }))
  },

  reset: () => {
    set({
      recording: false,
      sessionId: null,
      eventCount: 0,
      startedAt: null,
      events: [],
    })
  },
}))
