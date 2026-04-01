/**
 * Webhook processor — ported from Sim's lib/webhooks/processor.ts
 * Handles: path lookup, body parsing, provider auth verification, execution queueing.
 */
import crypto from 'node:crypto'
import { db } from '@/lib/db'
import { webhook, workflows, workflowExecutionLogs } from '@/lib/db/schema'
import { createLogger } from '@/lib/sim/logger'
import { and, eq, isNull } from 'drizzle-orm'
import { NextResponse, type NextRequest } from 'next/server'
import type { BlockState as SerializerBlockState } from '@/apps/automations/stores/workflow-types'
import { Serializer } from '@/lib/sim/serializer'
import { Executor } from '@/lib/sim/executor'
import { getEffectiveEnvVars } from '@/lib/environment/utils.server'
import { loadDeployedWorkflowState } from '@/lib/workflows/persistence/utils'
import { safeCompare } from '@/lib/core/security/encryption'

const logger = createLogger('WebhookProcessor')

interface WebhookWithWorkflow {
  webhook: typeof webhook.$inferSelect
  workflow: typeof workflows.$inferSelect
}

// ── Signature validators (copied from Sim's lib/webhooks/utils.server.ts) ────

function validateGitHubSignature(secret: string, signature: string, body: string): boolean {
  try {
    if (!secret || !signature || !body) return false

    let algorithm: 'sha256' | 'sha1'
    let providedSignature: string

    if (signature.startsWith('sha256=')) {
      algorithm = 'sha256'
      providedSignature = signature.substring(7)
    } else if (signature.startsWith('sha1=')) {
      algorithm = 'sha1'
      providedSignature = signature.substring(5)
    } else {
      return false
    }

    const computedHash = crypto.createHmac(algorithm, secret).update(body, 'utf8').digest('hex')
    return safeCompare(computedHash, providedSignature)
  } catch (error) {
    logger.error('Error validating GitHub signature:', error)
    return false
  }
}

function validateLinearSignature(secret: string, signature: string, body: string): boolean {
  try {
    if (!secret || !signature || !body) return false
    const computedHash = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex')
    return safeCompare(computedHash, signature)
  } catch (error) {
    logger.error('Error validating Linear signature:', error)
    return false
  }
}

function validateAttioSignature(secret: string, signature: string, body: string): boolean {
  try {
    if (!secret || !signature || !body) return false
    const computedHash = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex')
    return safeCompare(computedHash, signature)
  } catch (error) {
    logger.error('Error validating Attio signature:', error)
    return false
  }
}

function validateCirclebackSignature(secret: string, signature: string, body: string): boolean {
  try {
    if (!secret || !signature || !body) return false
    const computedHash = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex')
    return safeCompare(computedHash, signature)
  } catch (error) {
    logger.error('Error validating Circleback signature:', error)
    return false
  }
}

/** Shared by Jira, Confluence, Fireflies, Ashby — sha256= prefixed HMAC */
function validateSha256PrefixedSignature(
  secret: string,
  signature: string,
  body: string,
  providerName: string
): boolean {
  try {
    if (!secret || !signature || !body) return false
    if (!signature.startsWith('sha256=')) return false
    const providedSignature = signature.substring(7)
    const computedHash = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex')
    return safeCompare(computedHash, providedSignature)
  } catch (error) {
    logger.error(`Error validating ${providerName} signature:`, error)
    return false
  }
}

function validateCalcomSignature(secret: string, signature: string, body: string): boolean {
  try {
    if (!secret || !signature || !body) return false
    const providedSignature = signature.startsWith('sha256=')
      ? signature.substring(7)
      : signature
    const computedHash = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex')
    return safeCompare(computedHash, providedSignature)
  } catch (error) {
    logger.error('Error validating Cal.com signature:', error)
    return false
  }
}

function validateTypeformSignature(secret: string, signature: string, body: string): boolean {
  try {
    if (!secret || !signature || !body) return false
    if (!signature.startsWith('sha256=')) return false
    const providedSignature = signature.substring(7)
    const computedHash = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('base64')
    return safeCompare(computedHash, providedSignature)
  } catch (error) {
    logger.error('Error validating Typeform signature:', error)
    return false
  }
}

function validateMicrosoftTeamsSignature(
  hmacSecret: string,
  signature: string,
  body: string
): boolean {
  try {
    if (!hmacSecret || !signature || !body) return false
    if (!signature.startsWith('HMAC ')) return false
    const providedSignature = signature.substring(5)
    const secretBytes = Buffer.from(hmacSecret, 'base64')
    const bodyBytes = Buffer.from(body, 'utf8')
    const computedHash = crypto.createHmac('sha256', secretBytes).update(bodyBytes).digest('base64')
    return safeCompare(computedHash, providedSignature)
  } catch (error) {
    logger.error('Error validating Microsoft Teams signature:', error)
    return false
  }
}

async function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, any>
): Promise<boolean> {
  try {
    if (!authToken || !signature || !url) return false

    const sortedKeys = Object.keys(params).sort()
    let data = url
    for (const key of sortedKeys) {
      data += key + params[key]
    }

    const encoder = new TextEncoder()
    const key = await globalThis.crypto.subtle.importKey(
      'raw',
      encoder.encode(authToken),
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    )

    const signatureBytes = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(data))
    const signatureArray = Array.from(new Uint8Array(signatureBytes))
    const signatureBase64 = btoa(String.fromCharCode(...signatureArray))

    return safeCompare(signatureBase64, signature)
  } catch (error) {
    logger.error('Error validating Twilio signature:', error)
    return false
  }
}

function getExternalUrl(request: NextRequest): string {
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  if (host) {
    const url = new URL(request.url)
    return `${proto}://${host}${url.pathname}${url.search}`
  }
  return request.url
}

/** Resolve {{VARIABLE}} placeholders in providerConfig values */
function resolveProviderConfigEnvVars(
  config: Record<string, any>,
  envVars: Record<string, string>
): Record<string, any> {
  const resolved: Record<string, any> = {}
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string') {
      resolved[key] = value.replace(/\{\{(\w+)\}\}/g, (_match, varName) => {
        return envVars[varName] ?? _match
      })
    } else {
      resolved[key] = value
    }
  }
  return resolved
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Find all active webhooks for a given path
 */
export async function findAllWebhooksForPath(params: {
  requestId: string
  path: string
}): Promise<WebhookWithWorkflow[]> {
  const { requestId, path } = params

  const results = await db
    .select({
      webhook: webhook,
      workflow: workflows,
    })
    .from(webhook)
    .innerJoin(workflows, eq(webhook.workflowId, workflows.id))
    .where(
      and(
        eq(webhook.path, path),
        eq(webhook.isActive, true),
        isNull(webhook.archivedAt),
        eq(workflows.isDeployed, true)
      )
    )

  if (results.length === 0) {
    logger.warn(`[${requestId}] No active webhooks found for path: ${path}`)
    return []
  }

  logger.info(`[${requestId}] Found ${results.length} webhook(s) for path: ${path}`)
  return results
}

/**
 * Parse webhook request body, handling JSON, form-data, and raw text
 */
export async function parseWebhookBody(
  request: NextRequest,
  requestId: string
): Promise<{ body: Record<string, unknown>; rawBody: string } | NextResponse> {
  try {
    const contentType = request.headers.get('content-type') || ''
    const rawBody = await request.text()

    if (contentType.includes('application/json')) {
      try {
        const body = JSON.parse(rawBody)
        return { body: typeof body === 'object' && body !== null ? body : { data: body }, rawBody }
      } catch {
        logger.warn(`[${requestId}] Failed to parse JSON body, treating as raw text`)
        return { body: { rawBody }, rawBody }
      }
    }

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const params = new URLSearchParams(rawBody)
      const body: Record<string, unknown> = {}
      params.forEach((value, key) => {
        body[key] = value
      })
      return { body, rawBody }
    }

    // Raw text / other content types
    if (!rawBody || rawBody.length === 0) {
      return { body: {}, rawBody: '' }
    }
    return { body: { rawBody }, rawBody }
  } catch (error) {
    logger.error(`[${requestId}] Failed to parse webhook body`, error)
    return new NextResponse('Failed to parse request body', { status: 400 })
  }
}

/**
 * Verify provider-specific webhook signatures.
 * Ported from Sim's verifyProviderAuth — checks HMAC signatures per provider.
 */
export async function verifyProviderAuth(
  foundWebhook: typeof webhook.$inferSelect,
  foundWorkflow: typeof workflows.$inferSelect,
  request: NextRequest,
  rawBody: string,
  requestId: string
): Promise<NextResponse | null> {
  // Resolve {{VARIABLE}} references in providerConfig
  let envVars: Record<string, string> = {}
  try {
    if (foundWorkflow.userId) {
      envVars = await getEffectiveEnvVars(foundWorkflow.userId)
    }
  } catch (error) {
    logger.error(`[${requestId}] Failed to fetch environment variables`, error)
  }

  const rawProviderConfig = (foundWebhook.providerConfig as Record<string, any>) || {}
  const providerConfig = resolveProviderConfigEnvVars(rawProviderConfig, envVars)
  const provider = foundWebhook.provider

  // ── Microsoft Teams ────────────────────────────────────────────────────
  if (provider === 'microsoft-teams' && providerConfig.hmacSecret) {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('HMAC ')) {
      logger.warn(`[${requestId}] Microsoft Teams webhook missing HMAC authorization header`)
      return new NextResponse('Unauthorized - Missing HMAC signature', { status: 401 })
    }
    if (!validateMicrosoftTeamsSignature(providerConfig.hmacSecret, authHeader, rawBody)) {
      logger.warn(`[${requestId}] Microsoft Teams HMAC signature verification failed`)
      return new NextResponse('Unauthorized - Invalid HMAC signature', { status: 401 })
    }
  }

  // ── Ashby ──────────────────────────────────────────────────────────────
  if (provider === 'ashby' && providerConfig.secretToken) {
    const signature = request.headers.get('ashby-signature')
    if (!signature) {
      logger.warn(`[${requestId}] Ashby webhook missing Ashby-Signature header`)
      return new NextResponse('Unauthorized - Missing Ashby signature', { status: 401 })
    }
    if (!validateSha256PrefixedSignature(providerConfig.secretToken, signature, rawBody, 'Ashby')) {
      logger.warn(`[${requestId}] Ashby webhook signature verification failed`)
      return new NextResponse('Unauthorized - Invalid Ashby signature', { status: 401 })
    }
  }

  // ── Typeform ───────────────────────────────────────────────────────────
  if (provider === 'typeform' && providerConfig.secret) {
    const signature = request.headers.get('Typeform-Signature')
    if (!signature) {
      logger.warn(`[${requestId}] Typeform webhook missing signature header`)
      return new NextResponse('Unauthorized - Missing Typeform signature', { status: 401 })
    }
    if (!validateTypeformSignature(providerConfig.secret, signature, rawBody)) {
      logger.warn(`[${requestId}] Typeform signature verification failed`)
      return new NextResponse('Unauthorized - Invalid Typeform signature', { status: 401 })
    }
  }

  // ── Attio ──────────────────────────────────────────────────────────────
  if (provider === 'attio' && providerConfig.webhookSecret) {
    const signature = request.headers.get('Attio-Signature')
    if (!signature) {
      logger.warn(`[${requestId}] Attio webhook missing signature header`)
      return new NextResponse('Unauthorized - Missing Attio signature', { status: 401 })
    }
    if (!validateAttioSignature(providerConfig.webhookSecret, signature, rawBody)) {
      logger.warn(`[${requestId}] Attio signature verification failed`)
      return new NextResponse('Unauthorized - Invalid Attio signature', { status: 401 })
    }
  }

  // ── Linear ─────────────────────────────────────────────────────────────
  if (provider === 'linear' && providerConfig.webhookSecret) {
    const signature = request.headers.get('Linear-Signature')
    if (!signature) {
      logger.warn(`[${requestId}] Linear webhook missing signature header`)
      return new NextResponse('Unauthorized - Missing Linear signature', { status: 401 })
    }
    if (!validateLinearSignature(providerConfig.webhookSecret, signature, rawBody)) {
      logger.warn(`[${requestId}] Linear signature verification failed`)
      return new NextResponse('Unauthorized - Invalid Linear signature', { status: 401 })
    }
  }

  // ── Circleback ─────────────────────────────────────────────────────────
  if (provider === 'circleback' && providerConfig.webhookSecret) {
    const signature = request.headers.get('x-signature')
    if (!signature) {
      logger.warn(`[${requestId}] Circleback webhook missing signature header`)
      return new NextResponse('Unauthorized - Missing Circleback signature', { status: 401 })
    }
    if (!validateCirclebackSignature(providerConfig.webhookSecret, signature, rawBody)) {
      logger.warn(`[${requestId}] Circleback signature verification failed`)
      return new NextResponse('Unauthorized - Invalid Circleback signature', { status: 401 })
    }
  }

  // ── Cal.com ────────────────────────────────────────────────────────────
  if (provider === 'calcom' && providerConfig.webhookSecret) {
    const signature = request.headers.get('X-Cal-Signature-256')
    if (!signature) {
      logger.warn(`[${requestId}] Cal.com webhook missing signature header`)
      return new NextResponse('Unauthorized - Missing Cal.com signature', { status: 401 })
    }
    if (!validateCalcomSignature(providerConfig.webhookSecret, signature, rawBody)) {
      logger.warn(`[${requestId}] Cal.com signature verification failed`)
      return new NextResponse('Unauthorized - Invalid Cal.com signature', { status: 401 })
    }
  }

  // ── Jira ───────────────────────────────────────────────────────────────
  if (provider === 'jira' && providerConfig.webhookSecret) {
    const signature = request.headers.get('X-Hub-Signature')
    if (!signature) {
      logger.warn(`[${requestId}] Jira webhook missing signature header`)
      return new NextResponse('Unauthorized - Missing Jira signature', { status: 401 })
    }
    if (!validateSha256PrefixedSignature(providerConfig.webhookSecret, signature, rawBody, 'Jira')) {
      logger.warn(`[${requestId}] Jira signature verification failed`)
      return new NextResponse('Unauthorized - Invalid Jira signature', { status: 401 })
    }
  }

  // ── Confluence (reuses Jira validator) ─────────────────────────────────
  if (provider === 'confluence' && providerConfig.webhookSecret) {
    const signature = request.headers.get('X-Hub-Signature')
    if (!signature) {
      logger.warn(`[${requestId}] Confluence webhook missing signature header`)
      return new NextResponse('Unauthorized - Missing Confluence signature', { status: 401 })
    }
    if (!validateSha256PrefixedSignature(providerConfig.webhookSecret, signature, rawBody, 'Confluence')) {
      logger.warn(`[${requestId}] Confluence signature verification failed`)
      return new NextResponse('Unauthorized - Invalid Confluence signature', { status: 401 })
    }
  }

  // ── GitHub ─────────────────────────────────────────────────────────────
  if (provider === 'github' && providerConfig.webhookSecret) {
    const signature = request.headers.get('X-Hub-Signature-256') || request.headers.get('X-Hub-Signature')
    if (!signature) {
      logger.warn(`[${requestId}] GitHub webhook missing signature header`)
      return new NextResponse('Unauthorized - Missing GitHub signature', { status: 401 })
    }
    if (!validateGitHubSignature(providerConfig.webhookSecret, signature, rawBody)) {
      logger.warn(`[${requestId}] GitHub signature verification failed`)
      return new NextResponse('Unauthorized - Invalid GitHub signature', { status: 401 })
    }
  }

  // ── Fireflies ──────────────────────────────────────────────────────────
  if (provider === 'fireflies' && providerConfig.webhookSecret) {
    const signature = request.headers.get('x-hub-signature')
    if (!signature) {
      logger.warn(`[${requestId}] Fireflies webhook missing signature header`)
      return new NextResponse('Unauthorized - Missing Fireflies signature', { status: 401 })
    }
    if (!validateSha256PrefixedSignature(providerConfig.webhookSecret, signature, rawBody, 'Fireflies')) {
      logger.warn(`[${requestId}] Fireflies signature verification failed`)
      return new NextResponse('Unauthorized - Invalid Fireflies signature', { status: 401 })
    }
  }

  // ── Twilio Voice ───────────────────────────────────────────────────────
  if (provider === 'twilio_voice' && providerConfig.authToken) {
    const signature = request.headers.get('x-twilio-signature')
    if (!signature) {
      logger.warn(`[${requestId}] Twilio Voice webhook missing signature header`)
      return new NextResponse('Unauthorized - Missing Twilio signature', { status: 401 })
    }

    let params: Record<string, any> = {}
    try {
      if (typeof rawBody === 'string') {
        const urlParams = new URLSearchParams(rawBody)
        params = Object.fromEntries(urlParams.entries())
      }
    } catch (error) {
      logger.error(`[${requestId}] Error parsing Twilio webhook body for signature validation:`, error)
      return new NextResponse('Bad Request - Invalid body format', { status: 400 })
    }

    const fullUrl = getExternalUrl(request)
    const isValidSignature = await validateTwilioSignature(providerConfig.authToken, signature, fullUrl, params)
    if (!isValidSignature) {
      logger.warn(`[${requestId}] Twilio Voice signature verification failed`)
      return new NextResponse('Unauthorized - Invalid Twilio signature', { status: 401 })
    }
  }

  // ── Google Forms (shared-secret via header) ────────────────────────────
  if (provider === 'google_forms' && providerConfig.token) {
    let isTokenValid = false
    if (providerConfig.secretHeaderName) {
      const headerValue = request.headers.get(providerConfig.secretHeaderName.toLowerCase())
      if (headerValue && safeCompare(headerValue, providerConfig.token)) {
        isTokenValid = true
      }
    } else {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.toLowerCase().startsWith('bearer ')) {
        const token = authHeader.substring(7)
        if (safeCompare(token, providerConfig.token)) {
          isTokenValid = true
        }
      }
    }
    if (!isTokenValid) {
      logger.warn(`[${requestId}] Google Forms webhook authentication failed`)
      return new NextResponse('Unauthorized - Invalid secret', { status: 401 })
    }
  }

  // ── Generic webhook (Bearer token or custom header) ────────────────────
  if (provider === 'generic' && providerConfig.requireAuth) {
    const configToken = providerConfig.token
    const secretHeaderName = providerConfig.secretHeaderName

    if (configToken) {
      let isTokenValid = false

      if (secretHeaderName) {
        const headerValue = request.headers.get(secretHeaderName.toLowerCase())
        if (headerValue && safeCompare(headerValue, configToken)) {
          isTokenValid = true
        }
      } else {
        const authHeader = request.headers.get('authorization')
        if (authHeader?.toLowerCase().startsWith('bearer ')) {
          const token = authHeader.substring(7)
          if (safeCompare(token, configToken)) {
            isTokenValid = true
          }
        }
      }

      if (!isTokenValid) {
        return new NextResponse('Unauthorized - Invalid authentication token', { status: 401 })
      }
    } else {
      return new NextResponse('Unauthorized - Authentication required but not configured', { status: 401 })
    }
  }

  return null
}

/**
 * Provider challenge handlers (verification handshakes)
 */
export async function handleProviderChallenges(
  body: Record<string, unknown>,
  request: NextRequest,
  requestId: string,
  path: string
): Promise<NextResponse | null> {
  // Handle Slack URL verification challenge
  if (body.type === 'url_verification' && typeof body.challenge === 'string') {
    logger.info(`[${requestId}] Responding to Slack URL verification challenge for path: ${path}`)
    return NextResponse.json({ challenge: body.challenge })
  }

  // Handle Microsoft Graph subscription validation
  const url = new URL(request.url)
  const validationToken = url.searchParams.get('validationToken')
  if (validationToken) {
    logger.info(`[${requestId}] Microsoft Graph subscription validation for path: ${path}`)
    return new NextResponse(validationToken, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  // Handle WhatsApp/Meta verification (GET with hub.verify_token)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')
  if (mode === 'subscribe' && token && challenge) {
    logger.info(`[${requestId}] Responding to WhatsApp/Meta verification for path: ${path}`)
    return new NextResponse(challenge, { status: 200 })
  }

  return null
}

/**
 * Check if a webhook event should be skipped based on provider-specific filtering.
 */
export function shouldSkipWebhookEvent(
  foundWebhook: typeof webhook.$inferSelect,
  body: Record<string, unknown>,
  requestId: string
): boolean {
  const providerConfig = (foundWebhook.providerConfig as Record<string, any>) || {}

  // Stripe: filter by event type
  if (foundWebhook.provider === 'stripe') {
    const eventTypes = providerConfig.eventTypes
    if (eventTypes && Array.isArray(eventTypes) && eventTypes.length > 0) {
      const eventType = body?.type
      if (eventType && !eventTypes.includes(eventType)) {
        logger.info(`[${requestId}] Stripe event type '${eventType}' not in allowed list, skipping`)
        return true
      }
    }
  }

  // Grain: filter by event type
  if (foundWebhook.provider === 'grain') {
    const eventTypes = providerConfig.eventTypes
    if (eventTypes && Array.isArray(eventTypes) && eventTypes.length > 0) {
      const eventType = body?.type
      if (eventType && !eventTypes.includes(eventType)) {
        logger.info(`[${requestId}] Grain event type '${eventType}' not in allowed list, skipping`)
        return true
      }
    }
  }

  // Webflow: filter by collectionId
  if (foundWebhook.provider === 'webflow') {
    const configuredCollectionId = providerConfig.collectionId
    if (configuredCollectionId) {
      const payload = body?.payload as Record<string, unknown> | undefined
      const payloadCollectionId = payload?.collectionId || body?.collectionId
      if (payloadCollectionId && payloadCollectionId !== configuredCollectionId) {
        logger.info(`[${requestId}] Webflow collection doesn't match, skipping`)
        return true
      }
    }
  }

  return false
}

/**
 * Execute a workflow triggered by a webhook
 */
export async function queueWebhookExecution(
  foundWebhook: typeof webhook.$inferSelect,
  foundWorkflow: typeof workflows.$inferSelect,
  body: Record<string, unknown>,
  request: NextRequest,
  options: {
    requestId: string
    path: string
  }
): Promise<NextResponse> {
  const { requestId } = options
  const workflowId = foundWorkflow.id

  try {
    // Load deployed workflow state (not draft)
    const deployed = await loadDeployedWorkflowState(workflowId)
    const blockStates = deployed.blocks as unknown as Record<string, SerializerBlockState>
    const edges = deployed.edges

    // Inject webhook payload into the trigger block's output
    if (foundWebhook.blockId && blockStates[foundWebhook.blockId]) {
      const triggerBlock = blockStates[foundWebhook.blockId]
      triggerBlock.outputs = {
        ...triggerBlock.outputs,
        response: {
          type: 'any' as const,
          value: body,
        },
      } as any
    }

    // Serialize and execute
    const serializer = new Serializer()
    const serialized = serializer.serializeWorkflow(blockStates, edges)

    const executionId = crypto.randomUUID()
    const startTime = Date.now()

    const envVarValues = foundWorkflow.userId
      ? await getEffectiveEnvVars(foundWorkflow.userId)
      : {}
    const executor = new Executor({
      workflow: serialized,
      envVarValues,
      workflowVariables: (foundWorkflow.variables as Record<string, unknown>) ?? {},
    })

    const result = await executor.execute(workflowId)

    const endTime = Date.now()

    // Write execution log to DB
    await db.insert(workflowExecutionLogs).values({
      workflowId: workflowId as `${string}-${string}-${string}-${string}-${string}`,
      orgId: foundWorkflow.orgId,
      executionId: executionId as `${string}-${string}-${string}-${string}-${string}`,
      status: result.success ? 'success' : 'error',
      trigger: 'webhook',
      startedAt: new Date(startTime),
      endedAt: new Date(endTime),
      totalDurationMs: endTime - startTime,
      executionData: result.logs ?? [],
    })

    // Update workflow run count
    await db
      .update(workflows)
      .set({
        runCount: (foundWorkflow.runCount ?? 0) + 1,
        lastRunAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(workflows.id, workflowId))

    logger.info(
      `[${requestId}] Webhook execution completed for workflow ${workflowId}: ${result.success ? 'success' : 'error'}`
    )

    return NextResponse.json({
      success: result.success,
      executionId,
      output: result.output,
      error: result.error,
    })
  } catch (error: any) {
    logger.error(
      `[${requestId}] Webhook execution failed for workflow ${workflowId}`,
      error
    )
    return NextResponse.json(
      { error: error.message || 'Webhook execution failed' },
      { status: 500 }
    )
  }
}
