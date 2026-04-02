"use client"

import { useCallback, useEffect, useRef, useState, type FC } from "react"
import {
  AssistantRuntimeProvider,
  ThreadListPrimitive,
  ThreadListItemPrimitive,
  type ThreadMessageLike,
} from "@assistant-ui/react"
import { useExternalStoreRuntime } from "@assistant-ui/react"
import { Thread } from "@/components/thread"
import { cn } from "@/lib/utils"
import { PanelLeft, Plus, MessageSquare, Menu, Trash2 } from "lucide-react"
import { Robot } from "@phosphor-icons/react"

// ── Types ────────────────────────────────────────────────────────────────────

interface DBThread {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

interface DBMessage {
  id: string
  threadId: string
  role: string
  content: string | null
  toolCalls: unknown[] | null
  toolResults: unknown[] | null
  createdAt: string
}

// ── API helpers ──────────────────────────────────────────────────────────────

async function fetchThreads(): Promise<DBThread[]> {
  const res = await fetch("/api/agent/threads")
  if (!res.ok) return []
  const { threads } = await res.json()
  return threads
}

async function createThread(): Promise<DBThread> {
  const res = await fetch("/api/agent/threads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "New conversation" }),
  })
  const { thread } = await res.json()
  return thread
}

async function fetchThreadMessages(threadId: string): Promise<DBMessage[]> {
  const res = await fetch(`/api/agent/threads/${threadId}`)
  if (!res.ok) return []
  const { messages } = await res.json()
  return messages
}

async function archiveThread(threadId: string) {
  await fetch(`/api/agent/threads/${threadId}`, { method: "DELETE" })
}

async function renameThread(threadId: string, title: string) {
  await fetch(`/api/agent/threads/${threadId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  })
}

/** Convert DB messages to assistant-ui ThreadMessageLike format */
function convertDBMessage(msg: DBMessage): ThreadMessageLike {
  const role = msg.role === "assistant" ? "assistant" : "user"

  if (role === "assistant") {
    const content: any[] = []
    if (msg.content) {
      content.push({ type: "text", text: msg.content })
    }
    return { role: "assistant", id: msg.id, content }
  }

  return {
    role: "user",
    id: msg.id,
    content: [{ type: "text", text: msg.content ?? "" }],
  }
}

// ── Sidebar ─────────────────────────────────────────────────────────────────

const Logo: FC = () => (
  <div className="flex items-center gap-2 px-1">
    <Robot size={18} weight="fill" style={{ color: "var(--color-accent)" }} />
    <span className="font-semibold text-sm" style={{ color: "var(--color-text-primary)" }}>
      Agent
    </span>
  </div>
)

const ThreadListItem: FC = () => (
  <ThreadListItemPrimitive.Root className="group relative">
    <ThreadListItemPrimitive.Trigger asChild>
      <button className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-left transition-colors hover:bg-black/5 data-[active=true]:bg-black/5">
        <MessageSquare size={13} className="shrink-0 text-zinc-400" />
        <span className="truncate" style={{ color: "var(--color-text-primary)" }}>
          <ThreadListItemPrimitive.Title fallback="New conversation" />
        </span>
      </button>
    </ThreadListItemPrimitive.Trigger>
    <ThreadListItemPrimitive.Archive asChild>
      <button
        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-black/10 transition-all"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        <Trash2 size={13} />
      </button>
    </ThreadListItemPrimitive.Archive>
  </ThreadListItemPrimitive.Root>
)

const ThreadList: FC = () => (
  <ThreadListPrimitive.Root className="flex flex-col gap-0.5">
    <ThreadListPrimitive.New asChild>
      <button className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm transition-colors hover:bg-black/5" style={{ color: "var(--color-text-secondary)" }}>
        <Plus size={14} />
        New conversation
      </button>
    </ThreadListPrimitive.New>
    <ThreadListPrimitive.Items>
      {() => <ThreadListItem />}
    </ThreadListPrimitive.Items>
  </ThreadListPrimitive.Root>
)

const Sidebar: FC<{ collapsed: boolean }> = ({ collapsed }) => (
  <aside
    className={cn(
      "flex h-full flex-col border-r transition-all duration-200 shrink-0",
      collapsed ? "w-0 overflow-hidden opacity-0" : "w-60 opacity-100",
    )}
    style={{
      background: "var(--color-bg-sidebar)",
      borderColor: "var(--color-border)",
    }}
  >
    <div
      className="flex h-14 shrink-0 items-center px-4 border-b"
      style={{ borderColor: "var(--color-border)" }}
    >
      <Logo />
    </div>
    <div className="flex-1 overflow-y-auto p-2">
      <ThreadList />
    </div>
  </aside>
)

// ── Header ───────────────────────────────────────────────────────────────────

const Header: FC<{ sidebarCollapsed: boolean; onToggleSidebar: () => void }> = ({
  sidebarCollapsed,
  onToggleSidebar,
}) => (
  <header
    className="flex h-14 shrink-0 items-center gap-2 px-4 border-b"
    style={{
      background: "var(--color-bg-surface)",
      borderColor: "var(--color-border)",
    }}
  >
    <button
      onClick={onToggleSidebar}
      title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
      className="p-2 rounded-lg transition-colors hover:bg-black/5"
      style={{ color: "var(--color-text-secondary)" }}
    >
      {sidebarCollapsed ? <Menu size={18} /> : <PanelLeft size={18} />}
    </button>
  </header>
)

// ── Inner layout ─────────────────────────────────────────────────────────────

const AgentChatInner: FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="flex h-full w-full" style={{ background: "var(--color-bg-surface)" }}>
      <Sidebar collapsed={sidebarCollapsed} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
        />
        <main className="flex-1 overflow-hidden">
          <Thread />
        </main>
      </div>
    </div>
  )
}

// ── Root — external store runtime ────────────────────────────────────────────

export const AgentChat: FC = () => {
  const [threads, setThreads] = useState<DBThread[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ThreadMessageLike[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // Load thread list on mount
  useEffect(() => {
    fetchThreads().then(setThreads)
  }, [])

  // Load messages when active thread changes
  useEffect(() => {
    if (!activeThreadId) {
      setMessages([])
      return
    }
    fetchThreadMessages(activeThreadId).then((dbMsgs) => {
      // Filter out tool role messages for display
      const displayMsgs = dbMsgs
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map(convertDBMessage)
      setMessages(displayMsgs)
    })
  }, [activeThreadId])

  const handleNew = useCallback(
    async (message: { content: any[] }) => {
      // Extract text from the message
      const textPart = message.content?.find((p: any) => p.type === "text")
      const text = textPart?.text ?? ""
      if (!text) return

      // Ensure we have a thread
      let threadId = activeThreadId
      if (!threadId) {
        const thread = await createThread()
        threadId = thread.id
        setActiveThreadId(threadId)
        setThreads((prev) => [thread, ...prev])
      }

      // Add user message to UI immediately
      const userMsg: ThreadMessageLike = {
        role: "user",
        id: crypto.randomUUID(),
        content: [{ type: "text", text }],
      }
      setMessages((prev) => [...prev, userMsg])
      setIsRunning(true)

      try {
        const controller = new AbortController()
        abortRef.current = controller

        const res = await fetch("/api/agent/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            threadId,
            messages: [
              {
                id: userMsg.id,
                role: "user",
                parts: [{ type: "text", text }],
              },
            ],
          }),
          signal: controller.signal,
        })

        if (!res.ok || !res.body) {
          throw new Error(`Chat request failed: ${res.status}`)
        }

        // Parse the SSE stream
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let assistantText = ""
        const assistantMsgId = crypto.randomUUID()
        const toolCalls: Array<{ type: "tool-call"; toolCallId: string; toolName: string; args: any; result?: any }> = []

        const updateAssistantMessage = () => {
          const content: any[] = []
          for (const tc of toolCalls) {
            content.push(tc)
          }
          if (assistantText) {
            content.push({ type: "text", text: assistantText })
          }
          if (content.length === 0) return

          setMessages((prev) => {
            const existing = prev.findIndex((m) => m.id === assistantMsgId)
            const assistantMsg: ThreadMessageLike = {
              role: "assistant",
              id: assistantMsgId,
              content,
            }
            if (existing >= 0) {
              const updated = [...prev]
              updated[existing] = assistantMsg
              return updated
            }
            return [...prev, assistantMsg]
          })
        }

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue
            const data = line.slice(6)
            if (data === "[DONE]") continue

            try {
              const event = JSON.parse(data)

              if (event.type === "text-delta" && event.textDelta) {
                assistantText += event.textDelta
                updateAssistantMessage()
              }

              if (event.type === "tool-input-available") {
                toolCalls.push({
                  type: "tool-call",
                  toolCallId: event.toolCallId,
                  toolName: event.toolName,
                  args: event.input,
                })
                updateAssistantMessage()
              }

              if (event.type === "tool-output-available") {
                const tc = toolCalls.find((t) => t.toolCallId === event.toolCallId)
                if (tc) tc.result = event.output
                updateAssistantMessage()
              }

              // New step means a tool-call round finished, model continues
              if (event.type === "start-step") {
                // Reset text for the new step (tool result → new text)
              }
            } catch {
              // Non-JSON line, skip
            }
          }
        }

        // Mark any pending tool calls as complete (stream may end mid-tool-call
        // when stepCountIs limit is hit)
        let needsUpdate = false
        for (const tc of toolCalls) {
          if (tc.result === undefined) {
            tc.result = { status: "completed" }
            needsUpdate = true
          }
        }
        if (needsUpdate) updateAssistantMessage()

        // Final reload from DB to ensure we have the complete state
        if (!assistantText && toolCalls.length === 0) {
          const dbMsgs = await fetchThreadMessages(threadId)
          const displayMsgs = dbMsgs
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map(convertDBMessage)
          setMessages(displayMsgs)
        }

        // Refresh thread list to pick up title changes
        fetchThreads().then(setThreads)
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Chat error:", err)
        }
      } finally {
        setIsRunning(false)
        abortRef.current = null
      }
    },
    [activeThreadId]
  )

  const handleCancel = useCallback(async () => {
    abortRef.current?.abort()
    setIsRunning(false)
  }, [])

  const handleSwitchToThread = useCallback(async (threadId: string) => {
    setActiveThreadId(threadId)
  }, [])

  const handleSwitchToNewThread = useCallback(async () => {
    setActiveThreadId(null)
    setMessages([])
  }, [])

  const handleArchive = useCallback(
    async (threadId: string) => {
      await archiveThread(threadId)
      setThreads((prev) => prev.filter((t) => t.id !== threadId))
      if (activeThreadId === threadId) {
        setActiveThreadId(null)
        setMessages([])
      }
    },
    [activeThreadId]
  )

  const handleRename = useCallback(async (threadId: string, newTitle: string) => {
    await renameThread(threadId, newTitle)
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, title: newTitle } : t))
    )
  }, [])

  const runtime = useExternalStoreRuntime({
    messages,
    setMessages: setMessages as any,
    isRunning,
    onNew: handleNew as any,
    onCancel: handleCancel,
    convertMessage: (msg: ThreadMessageLike) => msg,
    adapters: {
      threadList: {
        threadId: activeThreadId ?? undefined,
        threads: threads.map((t) => ({
          id: t.id,
          remoteId: t.id,
          status: "regular" as const,
          title: t.title,
        })),
        onSwitchToThread: handleSwitchToThread,
        onSwitchToNewThread: handleSwitchToNewThread,
        onArchive: handleArchive,
        onRename: handleRename,
      },
    },
  })

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AgentChatInner />
    </AssistantRuntimeProvider>
  )
}
