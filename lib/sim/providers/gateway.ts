import type { ProviderRequest, ProviderResponse } from './types'

const GATEWAY_URL = process.env.GATEWAY_URL

if (!GATEWAY_URL && typeof window === 'undefined') {
  console.warn('[gateway] GATEWAY_URL not set — LLM calls will fail')
}

/**
 * Calls the gateway's OpenAI-compatible /v1/chat/completions endpoint.
 * All LLM traffic goes through here — no direct provider SDK usage.
 */
export async function callGateway(
  req: ProviderRequest,
  gatewayApiKey: string
): Promise<ProviderResponse> {
  const startTime = Date.now()
  const startIso = new Date().toISOString()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${gatewayApiKey}`,
  }

  // BYOK passthrough — user-supplied provider key, no gateway quota applied
  if (req.byokProvider && req.byokApiKey) {
    headers['x-byok-provider'] = req.byokProvider
    headers['x-byok-api-key'] = req.byokApiKey
  }

  // Build messages array from ProviderRequest
  const messages = req.messages ?? []
  if (req.systemPrompt && !messages.find((m) => m.role === 'system')) {
    messages.unshift({ role: 'system', content: req.systemPrompt })
  }

  // Map ProviderToolConfig[] to OpenAI function-call format
  const tools =
    req.tools && req.tools.length > 0
      ? req.tools.map((t) => ({
          type: 'function' as const,
          function: {
            name: t.id,
            description: t.description,
            parameters: t.parameters,
          },
        }))
      : undefined

  const body: Record<string, unknown> = {
    model: req.model,
    messages,
    stream: req.stream ?? false,
    ...(tools ? { tools } : {}),
    ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
    ...(req.maxTokens !== undefined ? { max_tokens: req.maxTokens } : {}),
    ...(req.responseFormat
      ? {
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: req.responseFormat.name,
              schema: req.responseFormat.schema,
              strict: req.responseFormat.strict ?? true,
            },
          },
        }
      : {}),
  }

  const res = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: req.abortSignal,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Gateway error ${res.status}: ${text}`)
  }

  const data = await res.json()
  const endTime = Date.now()
  const endIso = new Date().toISOString()
  const duration = endTime - startTime

  const choice = data.choices?.[0]
  const message = choice?.message ?? {}
  const usage = data.usage ?? {}

  // Map tool_calls back to FunctionCallResponse[]
  const toolCalls = message.tool_calls?.map((tc: any) => ({
    name: tc.function.name,
    arguments: (() => {
      try {
        return JSON.parse(tc.function.arguments)
      } catch {
        return {}
      }
    })(),
  }))

  return {
    content: message.content ?? '',
    model: data.model ?? req.model,
    tokens: {
      input: usage.prompt_tokens,
      output: usage.completion_tokens,
      total: usage.total_tokens,
    },
    toolCalls,
    timing: {
      startTime: startIso,
      endTime: endIso,
      duration,
    },
  }
}
