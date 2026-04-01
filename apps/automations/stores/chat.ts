import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ChatMessage {
  id: string
  content: string
  workflowId: string
  type: 'user' | 'workflow'
  timestamp: string
  isStreaming?: boolean
}

interface ChatState {
  isOpen: boolean
  messages: ChatMessage[]
  conversationIds: Record<string, string>

  setOpen: (open: boolean) => void
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  appendMessageContent: (messageId: string, content: string) => void
  finalizeMessageStream: (messageId: string) => void
  clearChat: (workflowId: string) => void
  getConversationId: (workflowId: string) => string
}

const MAX_MESSAGES = 100

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      messages: [],
      conversationIds: {},

      setOpen: (open) => set({ isOpen: open }),

      addMessage: (message) => {
        set((state) => {
          const newMessage: ChatMessage = {
            ...message,
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
          }
          return {
            messages: [...state.messages, newMessage].slice(-MAX_MESSAGES),
          }
        })
      },

      appendMessageContent: (messageId, content) => {
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === messageId ? { ...m, content: m.content + content } : m
          ),
        }))
      },

      finalizeMessageStream: (messageId) => {
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === messageId ? { ...m, isStreaming: false } : m
          ),
        }))
      },

      clearChat: (workflowId) => {
        set((state) => ({
          messages: state.messages.filter((m) => m.workflowId !== workflowId),
        }))
      },

      getConversationId: (workflowId) => {
        const existing = get().conversationIds[workflowId]
        if (existing) return existing
        const id = crypto.randomUUID()
        set((state) => ({
          conversationIds: { ...state.conversationIds, [workflowId]: id },
        }))
        return id
      },
    }),
    {
      name: 'workflow-chat',
      partialize: (state) => ({
        messages: state.messages,
        conversationIds: state.conversationIds,
      }),
    }
  )
)
