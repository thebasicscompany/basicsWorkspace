'use client'

import { type FC, type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUp, Square, X, Trash } from '@phosphor-icons/react'
import { useChatStore, type ChatMessage } from '@/apps/automations/stores/chat'
import { useTerminalConsoleStore } from '@/apps/automations/stores/terminal'

/**
 * Extract a human-readable string from a block output object.
 * Prioritizes known text fields, falls back to JSON.
 */
function extractOutputText(output: unknown): string {
  if (typeof output === 'string') return output
  if (!output || typeof output !== 'object') return JSON.stringify(output, null, 2)

  const obj = output as Record<string, unknown>

  // Try common text output fields in priority order
  for (const key of ['content', 'response', 'result', 'text', 'message', 'output', 'data']) {
    const val = obj[key]
    if (typeof val === 'string' && val.length > 0) return val
  }

  // If there's only one key and it's a string, use it
  const keys = Object.keys(obj)
  if (keys.length === 1 && typeof obj[keys[0]] === 'string') {
    return obj[keys[0]] as string
  }

  // Fall back to formatted JSON
  return JSON.stringify(output, null, 2)
}

interface WorkflowChatProps {
  workflowId: string
}

export const WorkflowChat: FC<WorkflowChatProps> = ({ workflowId }) => {
  const {
    isOpen,
    setOpen,
    messages,
    addMessage,
    appendMessageContent,
    finalizeMessageStream,
    clearChat,
    getConversationId,
  } = useChatStore()

  const [input, setInput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeStreamId = useRef<string | null>(null)

  const workflowMessages = messages.filter((m) => m.workflowId === workflowId)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [workflowMessages.length, workflowMessages[workflowMessages.length - 1]?.content])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isRunning) return

    setInput('')
    setIsRunning(true)

    // Add user message
    addMessage({ content: text, workflowId, type: 'user' })

    // Add placeholder for workflow response
    addMessage({
      content: '',
      workflowId,
      type: 'workflow',
      isStreaming: true,
    })
    // Get the actual ID from the store (last message)
    const storeMessages = useChatStore.getState().messages
    const streamMsg = storeMessages[storeMessages.length - 1]
    activeStreamId.current = streamMsg.id

    // Terminal setup — feed block events to the terminal console
    const executionId = crypto.randomUUID()
    const { addConsole, toggleConsole, isOpen } = useTerminalConsoleStore.getState()
    if (!isOpen) toggleConsole()
    let blockOrder = 0

    try {
      const conversationId = getConversationId(workflowId)
      const res = await fetch(`/api/workflows/${workflowId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text, conversationId }),
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText)
        useChatStore.setState((state) => ({
          messages: state.messages.map((m) =>
            m.id === streamMsg.id
              ? { ...m, content: `Error ${res.status}: ${errText}`, isStreaming: false }
              : m
          ),
        }))
        addConsole({
          workflowId,
          blockId: 'error',
          blockName: 'Request Failed',
          blockType: 'error',
          executionId,
          executionOrder: 1,
          startedAt: new Date().toISOString(),
          success: false,
          error: `HTTP ${res.status}: ${errText}`,
        })
        setIsRunning(false)
        return
      }

      if (!res.body) {
        appendMessageContent(streamMsg.id, 'No response received')
        finalizeMessageStream(streamMsg.id)
        setIsRunning(false)
        return
      }

      console.log('[WorkflowChat] Stream response received, status:', res.status, 'content-type:', res.headers.get('content-type'))
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let lastBlockOutput: string | null = null
      let eventCount = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log('[WorkflowChat] Stream done. Total events parsed:', eventCount, 'remaining buffer:', buffer)
          break
        }
        const chunk = decoder.decode(value, { stream: true })
        console.log('[WorkflowChat] Chunk received:', chunk.length, 'bytes')
        buffer += chunk

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            eventCount++
            console.log('[WorkflowChat] Event:', event.type, event.blockName || '')

            if (event.type === 'block:complete') {
              // Feed terminal
              blockOrder++
              addConsole({
                workflowId,
                blockId: event.blockId || 'unknown',
                blockName: event.blockName || event.blockType || 'Block',
                blockType: event.blockType || 'unknown',
                executionId,
                executionOrder: blockOrder,
                startedAt: event.startedAt || new Date().toISOString(),
                endedAt: event.endedAt || new Date().toISOString(),
                durationMs: event.durationMs,
                success: event.success !== false,
                output: event.output,
                error: event.error || null,
              })

              // Track last output for chat response
              if (event.output) {
                lastBlockOutput = extractOutputText(event.output)
              }
            } else if (event.type === 'complete') {
              if (!lastBlockOutput && event.output) {
                lastBlockOutput = extractOutputText(event.output)
              }
            } else if (event.type === 'error') {
              blockOrder++
              addConsole({
                workflowId,
                blockId: event.blockId || 'error',
                blockName: event.blockName || 'Error',
                blockType: 'error',
                executionId,
                executionOrder: blockOrder,
                startedAt: new Date().toISOString(),
                success: false,
                error: event.error || 'Unknown error',
              })
              lastBlockOutput = `Error: ${event.error}`
            }
          } catch {
            // skip malformed
          }
        }
      }

      // Update the response message with final content
      if (streamMsg.id) {
        // Replace content entirely with the final output
        const finalContent = lastBlockOutput || 'Workflow completed (no output)'
        // We need to set content, not append
        useChatStore.setState((state) => ({
          messages: state.messages.map((m) =>
            m.id === streamMsg.id
              ? { ...m, content: finalContent, isStreaming: false }
              : m
          ),
        }))
      }
    } catch (err: any) {
      if (streamMsg.id) {
        useChatStore.setState((state) => ({
          messages: state.messages.map((m) =>
            m.id === streamMsg.id
              ? { ...m, content: `Error: ${err.message}`, isStreaming: false }
              : m
          ),
        }))
      }
    } finally {
      setIsRunning(false)
      activeStreamId.current = null
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [input, isRunning, workflowId, addMessage, appendMessageContent, finalizeMessageStream, getConversationId])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  if (!isOpen) return null

  return (
    <div
      className="fixed z-30 flex flex-col overflow-hidden rounded-lg border shadow-lg"
      style={{
        right: 72,
        top: 64,
        width: 340,
        height: 400,
        background: 'var(--color-bg-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span
          className="font-semibold text-sm"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Chat
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => clearChat(workflowId)}
            disabled={workflowMessages.length === 0}
            className="p-1 rounded transition-colors hover:bg-black/5 disabled:opacity-30"
            title="Clear chat"
          >
            <Trash size={14} style={{ color: 'var(--color-text-tertiary)' }} />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded transition-colors hover:bg-black/5"
          >
            <X size={14} style={{ color: 'var(--color-text-tertiary)' }} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {workflowMessages.length === 0 ? (
          <div
            className="flex h-full items-center justify-center text-[13px]"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Type a message to run the workflow
          </div>
        ) : (
          workflowMessages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))
        )}
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-1">
        <div
          className="flex items-center rounded-lg border px-2"
          style={{
            borderColor: 'var(--color-border)',
            background: 'var(--color-bg-base)',
          }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isRunning}
            className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-[var(--color-text-tertiary)]"
            style={{ color: 'var(--color-text-primary)' }}
          />
          {isRunning ? (
            <button className="ml-1 p-1 rounded-full" style={{ background: 'var(--color-text-tertiary)' }}>
              <Square size={10} weight="fill" color="white" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="ml-1 p-1 rounded-full transition-opacity disabled:opacity-30"
              style={{ background: 'var(--color-accent)' }}
            >
              <ArrowUp size={14} weight="bold" color="white" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const ChatBubble: FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.type === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[85%] rounded-lg px-3 py-2 text-[13px] leading-relaxed"
        style={
          isUser
            ? {
                background: 'var(--color-accent)',
                color: 'white',
              }
            : {
                background: 'var(--color-bg-base)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
              }
        }
      >
        {message.isStreaming && !message.content ? (
          <span className="inline-flex gap-1">
            <span className="animate-bounce text-[10px]" style={{ animationDelay: '0ms' }}>●</span>
            <span className="animate-bounce text-[10px]" style={{ animationDelay: '150ms' }}>●</span>
            <span className="animate-bounce text-[10px]" style={{ animationDelay: '300ms' }}>●</span>
          </span>
        ) : (
          <pre className="whitespace-pre-wrap break-words font-sans">{message.content}</pre>
        )}
      </div>
    </div>
  )
}
