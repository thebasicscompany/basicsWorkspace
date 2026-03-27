/**
 * Webhook registration for workflow deployment.
 * Simplified from Sim's lib/webhooks/deploy.ts — no external subscription management,
 * no credential sets, no OAuth, no polling. Just DB-level webhook records.
 */
import { db } from '@/lib/db'
import { webhook } from '@/lib/db/schema'
import { createLogger } from '@/lib/sim/logger'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { getBlock } from '@/lib/sim/blocks'
import type { SubBlockConfig } from '@/lib/sim/blocks/types'
import type { BlockState } from '@/apps/automations/stores/workflow-types'
import { getTrigger, isTriggerValid } from '@/lib/sim/triggers'
import { SYSTEM_SUBBLOCK_IDS } from '@/lib/sim/triggers/constants'

const logger = createLogger('DeployWebhookSync')

interface TriggerSaveError {
  message: string
  status: number
}

interface TriggerSaveResult {
  success: boolean
  error?: TriggerSaveError
  warnings?: string[]
}

interface SaveTriggerWebhooksInput {
  workflowId: string
  blocks: Record<string, BlockState>
  requestId: string
  deploymentVersionId?: string
  previousVersionId?: string
}

function getSubBlockValue(block: BlockState, subBlockId: string): unknown {
  return block.subBlocks?.[subBlockId]?.value
}

function isFieldRequired(
  config: SubBlockConfig,
  subBlockValues: Record<string, { value?: unknown }>
): boolean {
  if (!config.required) return false
  if (typeof config.required === 'boolean') return config.required

  const evalCond = (
    cond: {
      field: string
      value: string | number | boolean | Array<string | number | boolean>
      not?: boolean
      and?: {
        field: string
        value: string | number | boolean | Array<string | number | boolean> | undefined
        not?: boolean
      }
    },
    values: Record<string, { value?: unknown }>
  ): boolean => {
    const fieldValue = values[cond.field]?.value
    const condValue = cond.value

    let match = Array.isArray(condValue)
      ? condValue.includes(fieldValue as string | number | boolean)
      : fieldValue === condValue

    if (cond.not) match = !match

    if (cond.and) {
      const andFieldValue = values[cond.and.field]?.value
      const andCondValue = cond.and.value
      let andMatch = Array.isArray(andCondValue)
        ? (andCondValue || []).includes(andFieldValue as string | number | boolean)
        : andFieldValue === andCondValue
      if (cond.and.not) andMatch = !andMatch
      match = match && andMatch
    }

    return match
  }

  const condition = typeof config.required === 'function' ? config.required() : config.required
  return evalCond(condition, subBlockValues)
}

function resolveTriggerId(block: BlockState): string | undefined {
  const blockConfig = getBlock(block.type)

  if (blockConfig?.category === 'triggers' && isTriggerValid(block.type)) {
    return block.type
  }

  if (!block.triggerMode) {
    return undefined
  }

  const selectedTriggerId = getSubBlockValue(block, 'selectedTriggerId')
  if (typeof selectedTriggerId === 'string' && isTriggerValid(selectedTriggerId)) {
    return selectedTriggerId
  }

  const storedTriggerId = getSubBlockValue(block, 'triggerId')
  if (typeof storedTriggerId === 'string' && isTriggerValid(storedTriggerId)) {
    return storedTriggerId
  }

  if (blockConfig?.triggers?.enabled) {
    const configuredTriggerId =
      typeof selectedTriggerId === 'string' ? selectedTriggerId : undefined
    if (configuredTriggerId && isTriggerValid(configuredTriggerId)) {
      return configuredTriggerId
    }

    const available = blockConfig.triggers?.available?.[0]
    if (available && isTriggerValid(available)) {
      return available
    }
  }

  return undefined
}

function getConfigValue(block: BlockState, subBlock: SubBlockConfig): unknown {
  const fieldValue = getSubBlockValue(block, subBlock.id)

  if (
    (fieldValue === null || fieldValue === undefined || fieldValue === '') &&
    Boolean(subBlock.required) &&
    subBlock.defaultValue !== undefined
  ) {
    return subBlock.defaultValue
  }

  return fieldValue
}

function buildProviderConfig(
  block: BlockState,
  triggerId: string,
  triggerDef: { subBlocks: SubBlockConfig[] }
): {
  providerConfig: Record<string, unknown>
  missingFields: string[]
  triggerPath: string
} {
  const triggerConfigValue = getSubBlockValue(block, 'triggerConfig')
  const baseConfig =
    triggerConfigValue && typeof triggerConfigValue === 'object'
      ? (triggerConfigValue as Record<string, unknown>)
      : {}

  const providerConfig: Record<string, unknown> = { ...baseConfig }
  const missingFields: string[] = []
  const subBlockValues = Object.fromEntries(
    Object.entries(block.subBlocks || {}).map(([key, value]) => [key, { value: value.value }])
  )

  triggerDef.subBlocks
    .filter((subBlock) => subBlock.mode === 'trigger' && !SYSTEM_SUBBLOCK_IDS.includes(subBlock.id))
    .forEach((subBlock) => {
      const valueToUse = getConfigValue(block, subBlock)
      if (valueToUse !== null && valueToUse !== undefined && valueToUse !== '') {
        providerConfig[subBlock.id] = valueToUse
      } else if (isFieldRequired(subBlock, subBlockValues)) {
        missingFields.push(subBlock.title || subBlock.id)
      }
    })

  providerConfig.triggerId = triggerId

  const triggerPathValue = getSubBlockValue(block, 'triggerPath')
  const triggerPath =
    typeof triggerPathValue === 'string' && triggerPathValue.length > 0
      ? triggerPathValue
      : block.id

  return { providerConfig, missingFields, triggerPath }
}

/**
 * Saves trigger webhook configurations as part of workflow deployment.
 * Simplified: no external subscriptions, no credential sets, no polling.
 */
export async function saveTriggerWebhooksForDeploy({
  workflowId,
  blocks,
  requestId,
  deploymentVersionId,
  previousVersionId,
}: SaveTriggerWebhooksInput): Promise<TriggerSaveResult> {
  const triggerBlocks = Object.values(blocks || {}).filter((b) => b && b.enabled !== false)
  const currentBlockIds = new Set(triggerBlocks.map((b) => b.id))

  // 1. Get ALL webhooks for this workflow
  const allWorkflowWebhooks = await db
    .select()
    .from(webhook)
    .where(and(eq(webhook.workflowId, workflowId), isNull(webhook.archivedAt)))

  // Separate webhooks by version
  const existingWebhooks: typeof allWorkflowWebhooks = []

  for (const wh of allWorkflowWebhooks) {
    if (deploymentVersionId && wh.deploymentVersionId === deploymentVersionId) {
      existingWebhooks.push(wh)
    }
  }

  const webhooksByBlockId = new Map<string, typeof existingWebhooks>()
  for (const wh of existingWebhooks) {
    if (!wh.blockId) continue
    const existingForBlock = webhooksByBlockId.get(wh.blockId) ?? []
    existingForBlock.push(wh)
    webhooksByBlockId.set(wh.blockId, existingForBlock)
  }

  logger.info(`[${requestId}] Starting webhook sync`, {
    workflowId,
    currentBlockIds: Array.from(currentBlockIds),
    existingWebhookBlockIds: Array.from(webhooksByBlockId.keys()),
  })

  const webhooksToDelete: typeof existingWebhooks = []
  const blocksNeedingWebhook: BlockState[] = []

  for (const block of triggerBlocks) {
    const triggerId = resolveTriggerId(block)
    if (!triggerId || !isTriggerValid(triggerId)) continue

    const triggerDef = getTrigger(triggerId)
    const provider = triggerDef.provider
    const { providerConfig, missingFields, triggerPath } = buildProviderConfig(
      block,
      triggerId,
      triggerDef
    )

    if (missingFields.length > 0) {
      return {
        success: false,
        error: {
          message: `Missing required fields for ${triggerDef.name || triggerId}: ${missingFields.join(', ')}`,
          status: 400,
        },
      }
    }

    const existingForBlock = webhooksByBlockId.get(block.id) ?? []
    if (existingForBlock.length === 0) {
      blocksNeedingWebhook.push(block)
    } else {
      const [existingWh, ...extraWebhooks] = existingForBlock
      if (extraWebhooks.length > 0) {
        webhooksToDelete.push(...extraWebhooks)
      }

      // Check if config changed
      const existingConfig = (existingWh.providerConfig as Record<string, unknown>) || {}
      const configChanged =
        JSON.stringify(existingConfig) !== JSON.stringify(providerConfig) ||
        existingWh.provider !== provider

      if (configChanged) {
        webhooksToDelete.push(existingWh)
        blocksNeedingWebhook.push(block)
        logger.info(`[${requestId}] Webhook config changed for block ${block.id}, will recreate`)
      }
    }
  }

  // Add orphaned webhooks (block no longer exists)
  for (const wh of existingWebhooks) {
    if (wh.blockId && !currentBlockIds.has(wh.blockId)) {
      webhooksToDelete.push(wh)
      logger.info(`[${requestId}] Webhook orphaned (block deleted): ${wh.blockId}`)
    }
  }

  // Delete webhooks that need deletion
  if (webhooksToDelete.length > 0) {
    logger.info(`[${requestId}] Deleting ${webhooksToDelete.length} webhook(s)`)
    const idsToDelete = webhooksToDelete.map((wh) => wh.id)
    await db.delete(webhook).where(inArray(webhook.id, idsToDelete))
  }

  // Create new webhooks
  try {
    await db.transaction(async (tx) => {
      for (const block of blocksNeedingWebhook) {
        const triggerId = resolveTriggerId(block)!
        const triggerDef = getTrigger(triggerId)
        const provider = triggerDef.provider
        const { providerConfig, triggerPath } = buildProviderConfig(block, triggerId, triggerDef)

        const webhookId = nanoid()
        await tx.insert(webhook).values({
          id: webhookId,
          workflowId,
          deploymentVersionId: deploymentVersionId || null,
          blockId: block.id,
          path: triggerPath,
          provider,
          providerConfig,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }
    })
  } catch (error: any) {
    logger.error(`[${requestId}] Failed to insert webhook records`, error)
    return {
      success: false,
      error: {
        message: error?.message || 'Failed to save webhook records',
        status: 500,
      },
    }
  }

  return { success: true }
}

/**
 * Clean up all webhooks for a workflow during undeploy.
 */
export async function cleanupWebhooksForWorkflow(
  workflowId: string,
  requestId: string,
  deploymentVersionId?: string
): Promise<void> {
  const existingWebhooks = await db
    .select()
    .from(webhook)
    .where(
      deploymentVersionId
        ? and(
            eq(webhook.workflowId, workflowId),
            eq(webhook.deploymentVersionId, deploymentVersionId),
            isNull(webhook.archivedAt)
          )
        : and(eq(webhook.workflowId, workflowId), isNull(webhook.archivedAt))
    )

  if (existingWebhooks.length === 0) {
    return
  }

  logger.info(
    `[${requestId}] Cleaning up ${existingWebhooks.length} webhook(s) for undeploy`,
    { workflowId, deploymentVersionId }
  )

  await db
    .delete(webhook)
    .where(
      deploymentVersionId
        ? and(
            eq(webhook.workflowId, workflowId),
            eq(webhook.deploymentVersionId, deploymentVersionId)
          )
        : eq(webhook.workflowId, workflowId)
    )

  logger.info(
    deploymentVersionId
      ? `[${requestId}] Cleaned up webhooks for workflow ${workflowId} deployment ${deploymentVersionId}`
      : `[${requestId}] Cleaned up all webhooks for workflow ${workflowId}`
  )
}
