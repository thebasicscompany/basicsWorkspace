/**
 * Provider layer — all LLM calls go through the gateway.
 * The multi-provider registry from Sim is replaced by a single gateway client.
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
 * Wrapper matching Sim's original executeProviderRequest(providerId, request) signature.
 * The providerId is ignored — all requests go through the single gateway.
 */
export async function executeProviderRequest(
  _providerId: string,
  request: ProviderRequest
): Promise<ProviderResponse> {
  return callGateway(request, '')
}
