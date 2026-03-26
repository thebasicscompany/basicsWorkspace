/**
 * Provider layer — all LLM calls go through the gateway.
 * Supports two modes:
 *   1. Platform key (GATEWAY_API_KEY) — tenant's pre-configured key
 *   2. BYOK — user provides their own provider API key in the block config
 */
import { callGateway } from './gateway'
import type { ProviderRequest, ProviderResponse } from './types'

export { callGateway }
export type {
  ProviderRequest,
  ProviderResponse,
  ProviderToolConfig,
  Message,
  FunctionCallResponse,
  TokenInfo,
  ProviderError,
} from './types'

export const MAX_TOOL_ITERATIONS = 20

/**
 * Infer the BYOK provider from a gateway model alias.
 * e.g. "basics-chat-fast-openai" → "openai"
 */
function inferProviderFromModel(model: string): string | null {
  if (model.endsWith('-openai')) return 'openai'
  if (model.endsWith('-anthropic')) return 'anthropic'
  if (model.endsWith('-gemini')) return 'gemini'
  return null
}

/**
 * Execute a provider request through the gateway.
 *
 * If the user supplied an apiKey in the block config, it's sent as BYOK
 * (the gateway uses their key directly with the provider, no platform quota).
 * Otherwise the platform GATEWAY_API_KEY is used.
 */
export async function executeProviderRequest(
  _providerId: string,
  request: ProviderRequest
): Promise<ProviderResponse> {
  const gatewayApiKey = process.env.GATEWAY_API_KEY ?? ''

  // If the user provided their own API key, pass it as BYOK
  if (request.apiKey && request.apiKey.trim() !== '') {
    const byokProvider = inferProviderFromModel(request.model)
    if (byokProvider) {
      request.byokProvider = byokProvider
      request.byokApiKey = request.apiKey
    }
  }

  return callGateway(request, gatewayApiKey)
}
