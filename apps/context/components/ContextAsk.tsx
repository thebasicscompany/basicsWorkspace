"use client"

import { useState, type FC } from "react"
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
import { Sparkle, ArrowUp, Stop } from "@phosphor-icons/react"

const MAX_WIDTH = 560

// ── Runtime wrapper — keyed so "Clear" fully resets state ─────────────────────

export function ContextAsk() {
  const [resetKey, setResetKey] = useState(0)
  return (
    <ContextAskSession
      key={resetKey}
      onClear={() => setResetKey((k) => k + 1)}
    />
  )
}

function ContextAskSession({ onClear }: { onClear: () => void }) {
  const runtime = useChatRuntime({
    transport: new DefaultChatTransport({ api: "/api/context/ask" }),
  })
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ContextAskInner onClear={onClear} />
    </AssistantRuntimeProvider>
  )
}

// ── Inner ─────────────────────────────────────────────────────────────────────

const ContextAskInner: FC<{ onClear: () => void }> = ({ onClear }) => (
  <ThreadPrimitive.Root
    className="aui-root"
    style={{ background: "var(--color-bg-surface)" }}
  >
    {/* ── Empty / welcome state ── */}
    <AuiIf condition={(s) => s.thread.isEmpty}>
      <div className="flex flex-col items-center px-6 py-7 gap-4">
        <div className="text-center">
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "var(--color-text-primary)",
              lineHeight: 1.3,
            }}
          >
            What do you want to know about your workspace?
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "var(--color-text-tertiary)",
              marginTop: 4,
            }}
          >
            Ask about contacts, deals, recent activity, or anything stored here.
          </p>
        </div>
        <div style={{ width: "100%", maxWidth: MAX_WIDTH }}>
          <Composer autoFocus />
        </div>
      </div>
    </AuiIf>

    {/* ── Active state ── */}
    <AuiIf condition={(s) => !s.thread.isEmpty}>
      {/* Scrollable conversation area, bounded so timeline stays visible */}
      <ThreadPrimitive.Viewport
        className="overflow-y-auto px-6 pt-5 pb-2"
        style={{ maxHeight: 268 }}
      >
        <div style={{ maxWidth: MAX_WIDTH, margin: "0 auto" }}>
          <ThreadPrimitive.Messages>
            {({ message }) =>
              message.role === "user" ? <UserMessage /> : <AssistantMessage />
            }
          </ThreadPrimitive.Messages>
        </div>
      </ThreadPrimitive.Viewport>

      {/* Follow-up bar */}
      <div
        className="flex items-center gap-2 px-6 py-3 border-t"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div style={{ flex: 1, maxWidth: MAX_WIDTH, margin: "0 auto" }}>
          <Composer />
        </div>
        <button
          onClick={onClear}
          className="shrink-0 transition-opacity hover:opacity-60"
          style={{ fontSize: 12, color: "var(--color-text-tertiary)", paddingLeft: 8 }}
        >
          Clear
        </button>
      </div>
    </AuiIf>
  </ThreadPrimitive.Root>
)

// ── User message ──────────────────────────────────────────────────────────────

const UserMessage: FC = () => (
  <MessagePrimitive.Root className="mb-3" data-role="user">
    <MessagePrimitive.Parts>
      {({ part }) =>
        part.type === "text" ? (
          <p
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "var(--color-text-primary)",
              lineHeight: 1.35,
            }}
          >
            {part.text}
          </p>
        ) : null
      }
    </MessagePrimitive.Parts>
  </MessagePrimitive.Root>
)

// ── Assistant message ─────────────────────────────────────────────────────────

const AssistantMessage: FC = () => (
  <MessagePrimitive.Root className="mb-6" data-role="assistant">
    <div className="flex items-center gap-1.5 mb-2">
      <Sparkle size={13} weight="fill" style={{ color: "var(--color-accent)" }} />
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--color-accent)",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        Answer
      </span>
    </div>
    <div style={{ fontSize: 14, color: "var(--color-text-primary)", lineHeight: 1.65 }}>
      <MessagePrimitive.Parts>
        {({ part }) => (part.type === "text" ? <MarkdownText /> : null)}
      </MessagePrimitive.Parts>
    </div>
  </MessagePrimitive.Root>
)

// ── Composer ──────────────────────────────────────────────────────────────────

const Composer: FC<{ autoFocus?: boolean }> = ({ autoFocus }) => (
  <ComposerPrimitive.Root>
    <div
      className="flex items-center gap-2 rounded-xl border px-3 py-2"
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-bg-base)",
        boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
      }}
    >
      <ComposerPrimitive.Input
        placeholder="Ask about your workspace…"
        className="flex-1 bg-transparent outline-none resize-none"
        style={{
          fontSize: 14,
          color: "var(--color-text-primary)",
        }}
        minRows={1}
        maxRows={5}
        autoFocus={autoFocus}
      />
      <AuiIf condition={(s) => !s.thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <button
            className="flex items-center justify-center rounded-lg shrink-0 transition-opacity hover:opacity-85"
            style={{ width: 28, height: 28, background: "var(--color-accent)" }}
            aria-label="Send"
          >
            <ArrowUp size={13} weight="bold" style={{ color: "#fff" }} />
          </button>
        </ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <button
            className="flex items-center justify-center rounded-lg shrink-0 transition-opacity hover:opacity-85"
            style={{ width: 28, height: 28, background: "var(--color-text-tertiary)" }}
            aria-label="Stop"
          >
            <Stop size={10} weight="fill" style={{ color: "#fff" }} />
          </button>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </div>
  </ComposerPrimitive.Root>
)
