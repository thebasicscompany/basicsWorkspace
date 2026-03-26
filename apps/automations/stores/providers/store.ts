/**
 * Phase 4 stub — providers Zustand store.
 * In Phase 3, model lists are static (gateway aliases only).
 * Phase 4 replaces this with a dynamic store fetching from GATEWAY_URL/v1/models.
 */
import { create } from 'zustand'

interface ProvidersState {
  providers: {
    base: { models: string[] }
    ollama: { models: string[] }
    vllm: { models: string[] }
    openrouter: { models: string[] }
  }
}

export const useProvidersStore = create<ProvidersState>(() => ({
  providers: {
    base: { models: ['basics-chat-fast', 'basics-chat-smart'] },
    ollama: { models: [] },
    vllm: { models: [] },
    openrouter: { models: [] },
  },
}))
