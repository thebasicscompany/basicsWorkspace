"use client"

import type { FC } from "react"
import {
  AssistantRuntimeProvider,
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react"
import { useChatRuntime } from "@assistant-ui/react-ai-sdk"
import { DefaultChatTransport } from "ai"
import { MarkdownText } from "@/components/markdown-text"
import { Sparkle, ArrowUp, Stop, Brain } from "@phosphor-icons/react"

// ─── Runtime wrapper ──────────────────────────────────────────────────────────

export function ContextSearch() {
  const runtime = useChatRuntime({
    transport: new DefaultChatTransport({ api: "/api/context/ask" }),
  })

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ContextSearchInner />
    </AssistantRuntimeProvider>
  )
}

// ─── Inner ────────────────────────────────────────────────────────────────────

const ContextSearchInner: FC = () => (
  <ThreadPrimitive.Root
    className="aui-root flex flex-col h-full overflow-hidden"
    style={{
      ["--thread-max-width" as string]: "48rem",
      background: "var(--color-bg-surface)",
    }}
  >
    {/* Empty state — centered welcome */}
    <AuiIf condition={(s) => s.thread.isEmpty}>
      <div className="flex flex-col flex-1 items-center justify-center px-6 pb-16">
        <div
          className="rounded-full flex items-center justify-center mb-6"
          style={{ width: 52, height: 52, background: "var(--color-accent-light)" }}
        >
          <Brain size={26} weight="fill" style={{ color: "var(--color-accent)" }} />
        </div>
        <h2
          className="text-center mb-2"
          style={{ fontSize: 24, fontWeight: 600, color: "var(--color-text-primary)", lineHeight: 1.25 }}
        >
          What do you want to know<br />about your workspace?
        </h2>
        <p
          className="text-center mb-8"
          style={{ fontSize: 14, color: "var(--color-text-tertiary)", maxWidth: 400 }}
        >
          Ask anything — about contacts, deals, recent activity,<br />or anything stored in your workspace.
        </p>
        <div style={{ width: "100%", maxWidth: "var(--thread-max-width)" }}>
          <Composer autoFocus />
        </div>
      </div>
    </AuiIf>

    {/* Active thread */}
    <AuiIf condition={(s) => !s.thread.isEmpty}>
      <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto" style={{ maxWidth: "var(--thread-max-width)" }}>
          <ThreadPrimitive.Messages>
            {({ message }) =>
              message.role === "user" ? <UserMessage /> : <AssistantMessage />
            }
          </ThreadPrimitive.Messages>
        </div>

        {/* Sticky composer at bottom */}
        <ThreadPrimitive.ViewportFooter className="sticky bottom-0 pb-4 pt-2" style={{ background: "var(--color-bg-surface)" }}>
          <div className="mx-auto" style={{ maxWidth: "var(--thread-max-width)" }}>
            <Composer />
          </div>
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </AuiIf>
  </ThreadPrimitive.Root>
)

// ─── User message ─────────────────────────────────────────────────────────────

const UserMessage: FC = () => (
  <MessagePrimitive.Root className="mb-8" data-role="user">
    <MessagePrimitive.Parts>
      {({ part }) =>
        part.type === "text" ? (
          <p style={{ fontSize: 26, fontWeight: 600, color: "var(--color-text-primary)", lineHeight: 1.3 }}>
            {part.text}
          </p>
        ) : null
      }
    </MessagePrimitive.Parts>
  </MessagePrimitive.Root>
)

// ─── Assistant message ────────────────────────────────────────────────────────

const AssistantMessage: FC = () => (
  <MessagePrimitive.Root className="mb-10" data-role="assistant">
    {/* "Answer" heading */}
    <div className="flex items-center gap-2 mb-3">
      <Sparkle size={16} weight="fill" style={{ color: "var(--color-accent)" }} />
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-accent)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
        Answer
      </span>
    </div>

    {/* Markdown body */}
    <div style={{ color: "var(--color-text-primary)", lineHeight: 1.7, fontSize: 15 }}>
      <MessagePrimitive.Parts>
        {({ part }) =>
          part.type === "text" ? <MarkdownText /> : null
        }
      </MessagePrimitive.Parts>
    </div>
  </MessagePrimitive.Root>
)

// ─── Composer ─────────────────────────────────────────────────────────────────

const Composer: FC<{ autoFocus?: boolean }> = ({ autoFocus }) => (
  <ComposerPrimitive.Root>
    <div
      className="flex items-end gap-3 rounded-2xl border px-4 py-3"
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-bg-base)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}
    >
      <ComposerPrimitive.Input
        placeholder="Ask about your workspace…"
        className="flex-1 bg-transparent outline-none resize-none"
        style={{ fontSize: 14, color: "var(--color-text-primary)" }}
        rows={1}
        autoFocus={autoFocus}
        aria-label="Ask about your workspace"
      />
      <AuiIf condition={(s) => !s.thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <button
            className="flex items-center justify-center rounded-xl shrink-0 transition-opacity hover:opacity-85"
            style={{ width: 32, height: 32, background: "var(--color-accent)" }}
            aria-label="Send"
          >
            <ArrowUp size={15} weight="bold" style={{ color: "#fff" }} />
          </button>
        </ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <button
            className="flex items-center justify-center rounded-xl shrink-0 transition-opacity hover:opacity-85"
            style={{ width: 32, height: 32, background: "var(--color-text-tertiary)" }}
            aria-label="Stop"
          >
            <Stop size={12} weight="fill" style={{ color: "#fff" }} />
          </button>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </div>
  </ComposerPrimitive.Root>
)
