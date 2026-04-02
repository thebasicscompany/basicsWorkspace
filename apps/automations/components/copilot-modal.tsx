"use client"

import { type FC, useCallback, useMemo } from "react"
import {
  AssistantRuntimeProvider,
  AssistantModalPrimitive,
} from "@assistant-ui/react"
import { useChatRuntime } from "@assistant-ui/react-ai-sdk"
import { DefaultChatTransport } from "ai"
import type { UIMessage } from "ai"
import { Thread } from "@/components/thread"
import { Sparkle } from "@phosphor-icons/react"

interface CopilotModalProps {
  workflowId: string
}

/**
 * Floating copilot button + modal chat panel for the automations canvas.
 * Uses assistant-ui's AssistantModalPrimitive for the popover behavior
 * and reuses the shared Thread component for the chat UI.
 */
export const CopilotModal: FC<CopilotModalProps> = ({ workflowId }) => {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/copilot",
        body: { workflowId },
      }),
    [workflowId]
  )

  const onFinish = useCallback(
    ({ message }: { message: UIMessage }) => {
      // Check if any edit_workflow tool calls were made in the response.
      // AI SDK v6 ToolUIPart type is `tool-{toolName}`, so edit_workflow → "tool-edit_workflow"
      const hasWorkflowEdit = message.parts?.some(
        (part) => part.type === "tool-edit_workflow"
      )
      if (hasWorkflowEdit) {
        // Dispatch event so the canvas can re-fetch and re-render
        window.dispatchEvent(
          new CustomEvent("copilot:workflow-updated", {
            detail: { workflowId },
          })
        )
      }
    },
    [workflowId]
  )

  const runtime = useChatRuntime({
    transport,
    onFinish,
  })

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <CopilotModalInner />
    </AssistantRuntimeProvider>
  )
}

const CopilotModalInner: FC = () => {
  return (
    <AssistantModalPrimitive.Root>
      <AssistantModalPrimitive.Anchor className="fixed bottom-4 right-4 z-50">
        <AssistantModalPrimitive.Trigger asChild>
          <button
            className="inline-flex items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              width: 48,
              height: 48,
              background: "var(--color-accent)",
              color: "white",
            }}
          >
            <Sparkle size={22} weight="fill" />
          </button>
        </AssistantModalPrimitive.Trigger>
      </AssistantModalPrimitive.Anchor>

      <AssistantModalPrimitive.Content
        sideOffset={24}
        className="z-50 rounded-[20px] shadow-xl border border-black/[0.06] overflow-hidden data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-2"
        style={{
          width: 420,
          height: 560,
          background: "var(--color-bg-surface)",
        }}
      >
        <div className="flex flex-col h-full">
          <div
            className="flex items-center gap-2 px-4 py-3 border-b"
            style={{ borderColor: "var(--color-border)" }}
          >
            <Sparkle
              size={16}
              weight="fill"
              style={{ color: "var(--color-accent)" }}
            />
            <span
              className="font-semibold text-sm"
              style={{ color: "var(--color-text-primary)" }}
            >
              Copilot
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <Thread />
          </div>
        </div>
      </AssistantModalPrimitive.Content>
    </AssistantModalPrimitive.Root>
  )
}
