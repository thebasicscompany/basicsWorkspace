/**
 * Provider utils — adapted for the gateway.
 * All LLM requests go through GATEWAY_URL; no per-provider API keys.
 * Functions that Sim used for routing to specific providers are stubbed
 * to always return 'gateway'. Phase 4 can expand if needed.
 */

import type { ProviderToolConfig } from './types'

// Gateway model aliases
export const GATEWAY_MODELS = ['basics-chat-fast', 'basics-chat-smart'] as const

// Always route through the single gateway provider
export function getProviderFromModel(_model: string): string {
  return 'gateway'
}

// Model metadata — minimal set for the UI, keyed by provider id
export function getBaseModelProviders(): Record<string, { id: string; name: string; models: string[] }> {
  return { gateway: { id: 'gateway', name: 'Basics AI', models: [...GATEWAY_MODELS] } }
}

export function getHostedModels(): string[] {
  return [...GATEWAY_MODELS]
}

export function getProviderIcon(_model: string): string | null {
  return null
}

// Cost is handled by the gateway — always return 0 here
export function calculateCost(
  _model: string,
  _inputTokens: number,
  _outputTokens: number,
  _useCachedInput?: boolean,
  _inputMultiplier?: number,
  _outputMultiplier?: number
) {
  return { input: 0, output: 0, total: 0, pricing: { input: 0, output: 0, updatedAt: new Date().toISOString() } }
}

// Model capability flags — conservative defaults for our gateway models
export function supportsTemperature(_model: string): boolean {
  return true
}
export function supportsReasoningEffort(_model: string): boolean {
  return false
}
export function supportsVerbosity(_model: string): boolean {
  return false
}
export function supportsThinking(_model: string): boolean {
  return false
}
export function shouldBillModelUsage(_model: string): boolean {
  return false // Gateway handles billing
}
export function sumToolCosts(_toolResults?: unknown[]): number {
  return 0
}
export function generateStructuredOutputInstructions(_format: unknown): string {
  return ''
}

// Model feature flags — Phase 4 can expand
export const MODELS_WITH_DEEP_RESEARCH: string[] = []
export const MODELS_WITH_REASONING_EFFORT: string[] = []
export const MODELS_WITH_THINKING: string[] = []
export const MODELS_WITH_VERBOSITY: string[] = []
export const MODELS_WITHOUT_MEMORY: string[] = []
export function getReasoningEffortValuesForModel(_model: string): string[] { return [] }
export function getThinkingLevelsForModel(_model: string): string[] { return [] }
export function getVerbosityValuesForModel(_model: string): string[] { return [] }
export function getMaxTemperature(_model: string): number { return 2 }

// Kept for block compatibility — maps block tool config into provider format
export async function transformBlockTool(
  tool: any,
  _ctx: {
    selectedOperation?: string
    getAllBlocks: () => unknown
    getToolAsync: (id: string) => Promise<unknown>
    getTool: (id: string) => unknown
    canonicalModes?: Record<string, 'basic' | 'advanced'>
  }
): Promise<ProviderToolConfig | null> {
  // Minimal pass-through; real implementation lives in Sim's original transformBlockTool
  if (!tool?.type) return null
  return {
    id: tool.type,
    name: tool.name ?? tool.type,
    description: tool.description ?? '',
    params: tool.params ?? {},
    parameters: tool.parameters ?? { type: 'object', properties: {}, required: [] },
    usageControl: tool.usageControl ?? 'auto',
  }
}

// providers map expected by blocks/utils.ts — empty stubs for providers not routed through our gateway
const emptyProvider = (id: string, name: string) => ({ id, name, models: [] as string[] })

export const providers: Record<string, { id: string; name: string; models: string[] }> = {
  gateway: { id: 'gateway', name: 'Basics AI', models: [...GATEWAY_MODELS] },
  vertex: emptyProvider('vertex', 'Google Vertex AI'),
  bedrock: emptyProvider('bedrock', 'AWS Bedrock'),
  'azure-openai': emptyProvider('azure-openai', 'Azure OpenAI'),
  'azure-anthropic': emptyProvider('azure-anthropic', 'Azure Anthropic'),
  ollama: emptyProvider('ollama', 'Ollama'),
  vllm: emptyProvider('vllm', 'vLLM'),
  openrouter: emptyProvider('openrouter', 'OpenRouter'),
  base: emptyProvider('base', 'Base'),
}
