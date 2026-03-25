"use client"

import { useState, type FC } from "react"
import {
  AssistantRuntimeProvider,
  ThreadListPrimitive,
  ThreadListItemPrimitive,
} from "@assistant-ui/react"
import { useChatRuntime } from "@assistant-ui/react-ai-sdk"
import { DefaultChatTransport } from "ai"
import { Thread } from "@/components/thread"
import { cn } from "@/lib/utils"
import { PanelLeft, Plus, MessageSquare, Menu } from "lucide-react"
import { Robot } from "@phosphor-icons/react"

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

// ── Root ─────────────────────────────────────────────────────────────────────

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

export const AgentChat: FC = () => {
  const runtime = useChatRuntime({
    transport: new DefaultChatTransport({ api: "/api/agent/chat" }),
  })

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AgentChatInner />
    </AssistantRuntimeProvider>
  )
}
