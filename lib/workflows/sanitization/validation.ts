/**
 * Workflow state validation and tool sanitization.
 * Copied from Sim's lib/workflows/sanitization/validation.ts
 * Import paths adapted to our repo structure.
 */
import { createLogger } from '@/lib/sim/logger'
import { getBlock } from '@/lib/sim/blocks/registry'
import { isCustomTool, isMcpTool } from '@/lib/sim/executor/constants'
import type { BlockState } from '@/apps/automations/stores/workflow-types'
import { getTool } from '@/lib/sim/tools/utils'

const logger = createLogger('WorkflowValidation')

/** Tool structure for validation */
interface AgentTool {
  type: string
  customToolId?: string
  schema?: {
    type?: string
    function?: {
      name?: string
      parameters?: {
        type?: string
        properties?: Record<string, unknown>
      }
    }
  }
  code?: string
  usageControl?: string
  [key: string]: unknown
}

/**
 * Checks if a custom tool has a valid inline schema
 */
function isValidCustomToolSchema(tool: unknown): boolean {
  try {
    if (!tool || typeof tool !== 'object') return false
    const t = tool as AgentTool
    if (t.type !== 'custom-tool') return true // non-custom tools are validated elsewhere

    const schema = t.schema
    if (!schema || typeof schema !== 'object') return false
    const fn = schema.function
    if (!fn || typeof fn !== 'object') return false
    if (!fn.name || typeof fn.name !== 'string') return false

    const params = fn.parameters
    if (!params || typeof params !== 'object') return false
    if (params.type !== 'object') return false
    if (!params.properties || typeof params.properties !== 'object') return false

    return true
  } catch (_err) {
    return false
  }
}

/**
 * Checks if a custom tool is a valid reference-only format (new format)
 */
function isValidCustomToolReference(tool: unknown): boolean {
  try {
    if (!tool || typeof tool !== 'object') return false
    const t = tool as AgentTool
    if (t.type !== 'custom-tool') return false

    if (t.customToolId && typeof t.customToolId === 'string') {
      return true
    }

    return false
  } catch (_err) {
    return false
  }
}

export function sanitizeAgentToolsInBlocks(blocks: Record<string, BlockState>): {
  blocks: Record<string, BlockState>
  warnings: string[]
} {
  const warnings: string[] = []
  const sanitizedBlocks: Record<string, BlockState> = { ...blocks }

  for (const [blockId, block] of Object.entries(sanitizedBlocks)) {
    try {
      if (!block || block.type !== 'agent') continue
      const subBlocks = block.subBlocks || {}
      const toolsSubBlock = subBlocks.tools
      if (!toolsSubBlock) continue

      let value = toolsSubBlock.value

      if (typeof value === 'string') {
        try {
          value = JSON.parse(value)
        } catch (_e) {
          warnings.push(
            `Block ${block.name || blockId}: invalid tools JSON; resetting tools to empty array`
          )
          value = []
        }
      }

      if (!Array.isArray(value)) {
        warnings.push(`Block ${block.name || blockId}: tools value is not an array; resetting`)
        toolsSubBlock.value = []
        continue
      }

      const originalLength = value.length
      const cleaned = value
        .filter((tool: unknown) => {
          if (!tool || typeof tool !== 'object') return false
          const t = tool as AgentTool
          if (t.type !== 'custom-tool') return true

          if (isValidCustomToolReference(tool)) {
            return true
          }

          const ok = isValidCustomToolSchema(tool)
          if (!ok) {
            logger.warn('Removing invalid custom tool from workflow', {
              blockId,
              blockName: block.name,
              hasCustomToolId: !!t.customToolId,
              hasSchema: !!t.schema,
            })
          }
          return ok
        })
        .map((tool: unknown) => {
          const t = tool as AgentTool
          if (t.type === 'custom-tool') {
            if (!t.usageControl) {
              t.usageControl = 'auto'
            }
            if (!t.customToolId && (!t.code || typeof t.code !== 'string')) {
              t.code = ''
            }
          }
          return tool
        })

      if (cleaned.length !== originalLength) {
        warnings.push(
          `Block ${block.name || blockId}: removed ${originalLength - cleaned.length} invalid tool(s)`
        )
      }

      toolsSubBlock.value = cleaned as unknown as typeof toolsSubBlock.value
      sanitizedBlocks[blockId] = { ...block, subBlocks: { ...subBlocks, tools: toolsSubBlock } }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      warnings.push(`Block ${block?.name || blockId}: tools sanitation failed: ${message}`)
    }
  }

  return { blocks: sanitizedBlocks, warnings }
}

export interface WorkflowValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  sanitizedBlocks?: Record<string, BlockState>
}

/**
 * Comprehensive workflow state validation.
 * Checks all tool references, block types, and required fields.
 */
export function validateWorkflowBlocks(
  blocks: Record<string, BlockState>,
  edges?: Array<{ source: string; target: string }>,
  options: { sanitize?: boolean } = {}
): WorkflowValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const sanitizedBlocks: Record<string, BlockState> = {}
  let hasChanges = false

  try {
    if (!blocks || typeof blocks !== 'object') {
      errors.push('Invalid workflow state: missing blocks')
      return { valid: false, errors, warnings }
    }

    for (const [blockId, block] of Object.entries(blocks)) {
      if (!block || typeof block !== 'object') {
        errors.push(`Block ${blockId}: invalid block structure`)
        continue
      }

      // Container blocks are always valid
      if (block.type === 'loop' || block.type === 'parallel') {
        sanitizedBlocks[blockId] = block
        continue
      }

      const blockConfig = getBlock(block.type)
      if (!blockConfig) {
        errors.push(`Block ${block.name || blockId}: unknown block type '${block.type}'`)
        if (options.sanitize) {
          hasChanges = true
          continue
        }
      }

      // Validate tool references in agent blocks
      if (block.type === 'agent' && block.subBlocks?.tools?.value) {
        const toolsSanitization = sanitizeAgentToolsInBlocks({ [blockId]: block })
        warnings.push(...toolsSanitization.warnings)
        if (toolsSanitization.warnings.length > 0) {
          sanitizedBlocks[blockId] = toolsSanitization.blocks[blockId]
          hasChanges = true
        } else {
          sanitizedBlocks[blockId] = block
        }
      } else {
        sanitizedBlocks[blockId] = block
      }
    }

    // Validate edges reference existing blocks
    if (edges && Array.isArray(edges)) {
      const blockIds = new Set(Object.keys(sanitizedBlocks))

      for (const edge of edges) {
        if (!blockIds.has(edge.source)) {
          errors.push(`Edge references non-existent source block '${edge.source}'`)
        }
        if (!blockIds.has(edge.target)) {
          errors.push(`Edge references non-existent target block '${edge.target}'`)
        }
      }
    }

    const valid = errors.length === 0
    return {
      valid,
      errors,
      warnings,
      sanitizedBlocks: options.sanitize && hasChanges ? sanitizedBlocks : undefined,
    }
  } catch (err) {
    logger.error('Workflow validation failed with exception', err)
    errors.push(`Validation failed: ${err instanceof Error ? err.message : String(err)}`)
    return { valid: false, errors, warnings }
  }
}

/**
 * Validate tool reference for a specific block.
 * Returns null if valid, error message if invalid.
 */
export function validateToolReference(
  toolId: string | undefined,
  blockType: string,
  blockName?: string
): string | null {
  if (!toolId) return null

  if (!isCustomTool(toolId) && !isMcpTool(toolId)) {
    const tool = getTool(toolId)
    if (!tool) {
      return `Block ${blockName || 'unknown'} (${blockType}): references non-existent tool '${toolId}'`
    }
  }

  return null
}
