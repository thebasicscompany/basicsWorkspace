/**
 * Webhook processor — simplified from Sim's lib/webhooks/processor.ts
 * Handles: path lookup, body parsing, execution queueing.
 * Stubbed: provider auth verification, billing checks, external subscription management.
 */
import { db } from '@/lib/db'
import { webhook, workflows, workflowBlocks, workflowEdges, workflowExecutionLogs } from '@/lib/db/schema'
import { createLogger } from '@/lib/sim/logger'
import { and, eq, isNull } from 'drizzle-orm'
import { NextResponse, type NextRequest } from 'next/server'
import { apiBlockToBlockState } from '@/apps/automations/stores/workflows/utils'
import type { BlockState as SerializerBlockState } from '@/apps/automations/stores/workflow-types'
import { Serializer } from '@/lib/sim/serializer'
import { Executor } from '@/lib/sim/executor'
import { getEffectiveEnvVars } from '@/lib/environment/utils.server'
import type { Edge } from 'reactflow'

const logger = createLogger('WebhookProcessor')

interface WebhookWithWorkflow {
  webhook: typeof webhook.$inferSelect
  workflow: typeof workflows.$inferSelect
}

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
    return { body: { rawBody }, rawBody }
  } catch (error) {
    logger.error(`[${requestId}] Failed to parse webhook body`, error)
    return new NextResponse('Failed to parse request body', { status: 400 })
  }
}

/**
 * Stub: provider auth verification — accepts all for now
 */
export async function verifyProviderAuth(
  _foundWebhook: typeof webhook.$inferSelect,
  _foundWorkflow: typeof workflows.$inferSelect,
  _request: NextRequest,
  _rawBody: string,
  _requestId: string
): Promise<NextResponse | null> {
  // TODO: Add per-provider signature verification (GitHub, Stripe, Slack, etc.)
  return null
}

/**
 * Stub: provider challenges (verification handshakes)
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

  // Handle WhatsApp verification (GET with hub.verify_token)
  const url = new URL(request.url)
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
 * Stub: skip check
 */
export function shouldSkipWebhookEvent(
  _foundWebhook: typeof webhook.$inferSelect,
  _body: Record<string, unknown>,
  _requestId: string
): boolean {
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
    // Load blocks + edges
    const apiBlocks = await db
      .select()
      .from(workflowBlocks)
      .where(eq(workflowBlocks.workflowId, workflowId))

    const apiEdges = await db
      .select()
      .from(workflowEdges)
      .where(eq(workflowEdges.workflowId, workflowId))

    // Convert to executor-compatible shapes
    const blockStates: Record<string, SerializerBlockState> = {}
    for (const ab of apiBlocks) {
      const bs = apiBlockToBlockState(ab) as unknown as SerializerBlockState
      blockStates[bs.id] = bs
    }

    const edges: Edge[] = apiEdges.map((e) => ({
      id: e.id,
      source: e.sourceBlockId,
      target: e.targetBlockId,
      sourceHandle: e.sourceHandle ?? undefined,
      targetHandle: e.targetHandle ?? undefined,
    }))

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
