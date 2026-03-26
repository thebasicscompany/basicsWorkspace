/**
 * Provider utils — ALL models go through the gateway.
 * The gateway handles routing to OpenAI, Anthropic, Gemini, etc.
 * It also supports BYOK (user's own API keys passed per-request).
 */

import type { ProviderToolConfig } from './types'

// ─── Gateway model catalog ──────────────────────────────────────────────────
// These are the model aliases the gateway accepts.
// Chat models only (embed/stt/tts are separate concerns).

// All gateway chat model aliases. Users with BYOK can use any of these.
// Platform-key availability depends on which provider keys are set in the gateway env.
export const GATEWAY_CHAT_MODELS = [
  'basics-chat-fast-openai',
  'basics-chat-smart-openai',
  'basics-chat-fast-anthropic',
  'basics-chat-smart-anthropic',
  'basics-chat-smartest-anthropic',
  'basics-chat-fast-gemini',
  'basics-chat-smart-gemini',
] as const

export type GatewayChatModel = (typeof GATEWAY_CHAT_MODELS)[number]

// Friendly labels for the dropdown
const MODEL_LABELS: Record<string, string> = {
  'basics-chat-fast-openai': 'Fast — OpenAI',
  'basics-chat-smart-openai': 'Smart — OpenAI',
  'basics-chat-fast-anthropic': 'Fast — Anthropic',
  'basics-chat-smart-anthropic': 'Smart — Anthropic',
  'basics-chat-smartest-anthropic': 'Smartest — Anthropic',
  'basics-chat-fast-gemini': 'Fast — Gemini',
  'basics-chat-smart-gemini': 'Smart — Gemini',
}

// ─── Model options for dropdown/combobox ────────────────────────────────────

/** Returns model options for the block config dropdown. */
export function getModelOptions(): Array<{ label: string; id: string }> {
  return GATEWAY_CHAT_MODELS.map((id) => ({
    label: MODEL_LABELS[id] ?? id,
    id,
  }))
}

// ─── Provider routing (everything → gateway) ────────────────────────────────

export function getProviderFromModel(_model: string): string {
  return 'gateway'
}

/**
 * Maps model name → tool ID for the block config's tool() function.
 * Every model routes to 'gateway_chat' since the gateway handles all routing.
 */
export function getBaseModelProviders(): Record<string, string> {
  const map: Record<string, string> = {}
  for (const model of GATEWAY_CHAT_MODELS) {
    map[model] = 'gateway_chat'
  }
  return map
}

export function getHostedModels(): string[] {
  return [...GATEWAY_CHAT_MODELS]
}

export function getProviderIcon(_model: string): string | null {
  return null
}

// ─── Cost (handled by gateway) ──────────────────────────────────────────────

export function calculateCost(
  _model: string, _inputTokens: number, _outputTokens: number,
  _useCachedInput?: boolean, _inputMultiplier?: number, _outputMultiplier?: number
) {
  return { input: 0, output: 0, total: 0, pricing: { input: 0, output: 0, updatedAt: new Date().toISOString() } }
}

// ─── Model capability flags ─────────────────────────────────────────────────

export function supportsTemperature(_model: string): boolean { return true }
export function supportsReasoningEffort(_model: string): boolean { return false }
export function supportsVerbosity(_model: string): boolean { return false }
export function supportsThinking(_model: string): boolean { return false }
export function supportsToolUsageControl(_model: string): boolean { return false }
export function shouldBillModelUsage(_model: string): boolean { return false }
export function sumToolCosts(_toolResults?: unknown[]): number { return 0 }
export function generateStructuredOutputInstructions(_format: unknown): string { return '' }
export function getMaxTemperature(_model: string): number { return 2 }

export const MODELS_WITH_DEEP_RESEARCH: string[] = []
export const MODELS_WITH_REASONING_EFFORT: string[] = []
export const MODELS_WITH_THINKING: string[] = []
export const MODELS_WITH_VERBOSITY: string[] = []
export const MODELS_WITHOUT_MEMORY: string[] = []
export function getReasoningEffortValuesForModel(_model: string): string[] { return [] }
export function getThinkingLevelsForModel(_model: string): string[] { return [] }
export function getVerbosityValuesForModel(_model: string): string[] { return [] }

// ─── Block tool transform ───────────────────────────────────────────────────

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

// ─── Providers map (for block condition fields) ─────────────────────────────
// Sim blocks use `condition: { field: 'model', value: providers.vertex.models }`
// We keep empty arrays since we don't have provider-specific models.

const emptyProvider = (id: string, name: string) => ({ id, name, models: [] as string[] })

export const providers: Record<string, { id: string; name: string; models: string[] }> = {
  gateway: { id: 'gateway', name: 'Basics AI', models: [...GATEWAY_CHAT_MODELS] },
  vertex: emptyProvider('vertex', 'Google Vertex AI'),
  bedrock: emptyProvider('bedrock', 'AWS Bedrock'),
  'azure-openai': emptyProvider('azure-openai', 'Azure OpenAI'),
  'azure-anthropic': emptyProvider('azure-anthropic', 'Azure Anthropic'),
  ollama: emptyProvider('ollama', 'Ollama'),
  vllm: emptyProvider('vllm', 'vLLM'),
  openrouter: emptyProvider('openrouter', 'OpenRouter'),
  base: emptyProvider('base', 'Base'),
}

export function filterSchemaForLLM(schema: any, _userParams?: any): any { return schema }
