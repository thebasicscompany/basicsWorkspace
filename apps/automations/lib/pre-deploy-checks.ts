import type { Edge } from 'reactflow'
import { Serializer } from '@/lib/sim/serializer'
import type { BlockState } from '@/apps/automations/stores/workflow-types'

export interface PreDeployCheckResult {
  passed: boolean
  error?: string
}

export interface PreDeployContext {
  blocks: Record<string, BlockState>
  edges: Edge[]
  workflowId: string
}

type PreDeployCheck = (context: PreDeployContext) => PreDeployCheckResult

/**
 * Validates required fields using the serializer's validation
 */
const requiredFieldsCheck: PreDeployCheck = ({ blocks, edges }) => {
  try {
    const serializer = new Serializer()
    serializer.serializeWorkflow(blocks as any, edges)
    return { passed: true }
  } catch (error) {
    return {
      passed: false,
      error: error instanceof Error ? error.message : 'Workflow validation failed',
    }
  }
}

/**
 * Checks that the workflow has at least one block
 */
const hasBlocksCheck: PreDeployCheck = ({ blocks }) => {
  if (Object.keys(blocks).length === 0) {
    return { passed: false, error: 'Workflow has no blocks' }
  }
  return { passed: true }
}

/**
 * Checks that blocks are connected (no orphaned blocks except start/trigger)
 */
const connectivityCheck: PreDeployCheck = ({ blocks, edges }) => {
  const blockIds = Object.keys(blocks)
  if (blockIds.length <= 1) return { passed: true }

  const connected = new Set<string>()
  for (const edge of edges) {
    connected.add(edge.source)
    connected.add(edge.target)
  }

  // Start/trigger blocks are allowed to be sources only
  const orphaned = blockIds.filter((id) => !connected.has(id))
  if (orphaned.length > 0) {
    const names = orphaned.map((id) => blocks[id]?.name || id).join(', ')
    return { passed: false, error: `Disconnected blocks: ${names}` }
  }
  return { passed: true }
}

/**
 * All pre-deploy checks in execution order
 */
const preDeployChecks: PreDeployCheck[] = [hasBlocksCheck, connectivityCheck, requiredFieldsCheck]

/**
 * Runs all pre-deploy checks and returns the first failure or success.
 * Copied from Sim's use-predeploy-checks.ts.
 */
export function runPreDeployChecks(context: PreDeployContext): PreDeployCheckResult {
  for (const check of preDeployChecks) {
    const result = check(context)
    if (!result.passed) {
      return result
    }
  }
  return { passed: true }
}
