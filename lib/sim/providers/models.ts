// Phase 4 stub — provider model definitions
// Real token limits used by memory.ts for context window calculations

export interface ModelDefinition {
  id: string
  name?: string
  contextWindow: number
  maxOutputTokens?: number
}

export interface ProviderDefinition {
  contextWindow: number
  contextInformationAvailable?: boolean
  modelPatterns?: RegExp[]
  models: ModelDefinition[]
}

export const PROVIDER_DEFINITIONS: Record<string, ProviderDefinition> = {
  gateway: {
    contextWindow: 128_000,
    contextInformationAvailable: true,
    modelPatterns: [],
    models: [
      { id: 'basics-chat-fast', contextWindow: 128_000 },
      { id: 'basics-chat-smart', contextWindow: 200_000 },
    ],
  },
}
