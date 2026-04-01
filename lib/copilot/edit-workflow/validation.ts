/**
 * Edit workflow validation — adapted from Sim's edit-workflow/validation.ts
 * Changes: import paths adjusted to our codebase, removed selector-validator (stubbed),
 * removed permission group imports, removed @sim/logger
 */
import { getBlock } from '@/lib/sim/blocks/registry'
import type { SubBlockConfig } from '@/lib/sim/blocks/types'
import { EDGE, normalizeName } from '@/lib/sim/executor/constants'
import { TRIGGER_RUNTIME_SUBBLOCK_IDS } from '@/lib/sim/triggers/constants'
import type {
  EdgeHandleValidationResult,
  EditWorkflowOperation,
  PermissionGroupConfig,
  ValidationError,
  ValidationResult,
  ValueValidationResult,
} from './types'
import { SELECTOR_TYPES } from './types'

/**
 * Finds an existing block with the same normalized name.
 */
export function findBlockWithDuplicateNormalizedName(
  blocks: Record<string, any>,
  name: string,
  excludeBlockId: string
): [string, any] | undefined {
  const normalizedName = normalizeName(name)
  return Object.entries(blocks).find(
    ([blockId, block]: [string, any]) =>
      blockId !== excludeBlockId && normalizeName(block.name || '') === normalizedName
  )
}

/**
 * Validates and filters inputs against a block's subBlock configuration
 * Returns valid inputs and any validation errors encountered
 */
export function validateInputsForBlock(
  blockType: string,
  inputs: Record<string, any>,
  blockId: string
): ValidationResult {
  const errors: ValidationError[] = []
  const blockConfig = getBlock(blockType)

  if (!blockConfig) {
    // Unknown block type - return inputs as-is (let it fail later if invalid)
    console.warn(`[EditWorkflowValidation] Unknown block type: ${blockType}, skipping validation`)
    return { validInputs: inputs, errors: [] }
  }

  const validatedInputs: Record<string, any> = {}
  const subBlockMap = new Map<string, SubBlockConfig>()

  // Build map of subBlock id -> config
  for (const subBlock of blockConfig.subBlocks) {
    subBlockMap.set(subBlock.id, subBlock)
  }

  for (const [key, value] of Object.entries(inputs)) {
    // Skip runtime subblock IDs
    if (TRIGGER_RUNTIME_SUBBLOCK_IDS.includes(key)) {
      continue
    }

    const subBlockConfig = subBlockMap.get(key)

    // If subBlock doesn't exist in config, skip it (unless it's a known dynamic field)
    if (!subBlockConfig) {
      // Some fields are valid but not in subBlocks (like loop/parallel config)
      // Allow these through for special block types
      if (blockType === 'loop' || blockType === 'parallel') {
        validatedInputs[key] = value
      } else {
        errors.push({
          blockId,
          blockType,
          field: key,
          value,
          error: `Unknown input field "${key}" for block type "${blockType}"`,
        })
      }
      continue
    }

    // Validate value based on subBlock type
    const validationResult = validateValueForSubBlockType(
      subBlockConfig,
      value,
      key,
      blockType,
      blockId
    )
    if (validationResult.valid) {
      validatedInputs[key] = validationResult.value
    } else if (validationResult.error) {
      errors.push(validationResult.error)
    }
  }

  return { validInputs: validatedInputs, errors }
}

/**
 * Validates a value against its expected subBlock type
 */
export function validateValueForSubBlockType(
  subBlockConfig: SubBlockConfig,
  value: any,
  fieldName: string,
  blockType: string,
  blockId: string
): ValueValidationResult {
  const { type } = subBlockConfig

  // Handle null/undefined - allow clearing fields
  if (value === null || value === undefined) {
    return { valid: true, value }
  }

  switch (type) {
    case 'dropdown': {
      const options =
        typeof subBlockConfig.options === 'function'
          ? subBlockConfig.options()
          : subBlockConfig.options
      if (options && Array.isArray(options)) {
        const validIds = options.map((opt) => opt.id)
        if (!validIds.includes(value)) {
          return {
            valid: false,
            error: {
              blockId,
              blockType,
              field: fieldName,
              value,
              error: `Invalid dropdown value "${value}" for field "${fieldName}". Valid options: ${validIds.join(', ')}`,
            },
          }
        }
      }
      return { valid: true, value }
    }

    case 'slider': {
      const numValue = typeof value === 'number' ? value : Number(value)
      if (Number.isNaN(numValue)) {
        return {
          valid: false,
          error: {
            blockId,
            blockType,
            field: fieldName,
            value,
            error: `Invalid slider value "${value}" for field "${fieldName}" - must be a number`,
          },
        }
      }
      let clampedValue = numValue
      if (subBlockConfig.min !== undefined && numValue < subBlockConfig.min) {
        clampedValue = subBlockConfig.min
      }
      if (subBlockConfig.max !== undefined && numValue > subBlockConfig.max) {
        clampedValue = subBlockConfig.max
      }
      return {
        valid: true,
        value: subBlockConfig.integer ? Math.round(clampedValue) : clampedValue,
      }
    }

    case 'switch': {
      if (typeof value !== 'boolean') {
        return {
          valid: false,
          error: {
            blockId,
            blockType,
            field: fieldName,
            value,
            error: `Invalid switch value "${value}" for field "${fieldName}" - must be true or false`,
          },
        }
      }
      return { valid: true, value }
    }

    case 'file-upload': {
      if (value === null) return { valid: true, value: null }
      if (typeof value !== 'object') {
        return {
          valid: false,
          error: {
            blockId,
            blockType,
            field: fieldName,
            value,
            error: `Invalid file-upload value for field "${fieldName}" - expected object with name and path properties, or null`,
          },
        }
      }
      if (value && (!value.name || !value.path)) {
        return {
          valid: false,
          error: {
            blockId,
            blockType,
            field: fieldName,
            value,
            error: `Invalid file-upload object for field "${fieldName}" - must have "name" and "path" properties`,
          },
        }
      }
      return { valid: true, value }
    }

    case 'input-format':
    case 'table': {
      if (!Array.isArray(value)) {
        return {
          valid: false,
          error: {
            blockId,
            blockType,
            field: fieldName,
            value,
            error: `Invalid ${type} value for field "${fieldName}" - expected an array`,
          },
        }
      }
      return { valid: true, value }
    }

    case 'condition-input':
    case 'router-input': {
      const parsedValue =
        typeof value === 'string'
          ? (() => {
              try {
                return JSON.parse(value)
              } catch {
                return null
              }
            })()
          : value

      if (!Array.isArray(parsedValue)) {
        return {
          valid: false,
          error: {
            blockId,
            blockType,
            field: fieldName,
            value,
            error: `Invalid ${type} value for field "${fieldName}" - expected a JSON array`,
          },
        }
      }

      return { valid: true, value }
    }

    case 'tool-input': {
      if (!Array.isArray(value)) {
        return {
          valid: false,
          error: {
            blockId,
            blockType,
            field: fieldName,
            value,
            error: `Invalid tool-input value for field "${fieldName}" - expected an array of tool objects`,
          },
        }
      }
      return { valid: true, value }
    }

    case 'code': {
      if (typeof value !== 'string') {
        return {
          valid: false,
          error: {
            blockId,
            blockType,
            field: fieldName,
            value,
            error: `Invalid code value for field "${fieldName}" - expected a string, got ${typeof value}`,
          },
        }
      }
      return { valid: true, value }
    }

    case 'response-format': {
      if (value === null || value === undefined || value === '') {
        return { valid: true, value }
      }
      if (typeof value === 'object') {
        return { valid: true, value }
      }
      if (typeof value === 'string') {
        try {
          JSON.parse(value)
          return { valid: true, value }
        } catch {
          return {
            valid: false,
            error: {
              blockId,
              blockType,
              field: fieldName,
              value,
              error: `Invalid response-format value for field "${fieldName}" - string must be valid JSON`,
            },
          }
        }
      }
      return {
        valid: false,
        error: {
          blockId,
          blockType,
          field: fieldName,
          value,
          error: `Invalid response-format value for field "${fieldName}" - expected a JSON string or object`,
        },
      }
    }

    case 'short-input':
    case 'long-input':
    case 'combobox': {
      if (typeof value !== 'string' && typeof value !== 'number') {
        return { valid: true, value: String(value) }
      }
      return { valid: true, value }
    }

    // Selector types - allow strings (IDs) or arrays of strings
    case 'oauth-input':
    case 'knowledge-base-selector':
    case 'document-selector':
    case 'file-selector':
    case 'project-selector':
    case 'channel-selector':
    case 'folder-selector':
    case 'mcp-server-selector':
    case 'mcp-tool-selector':
    case 'workflow-selector': {
      if (subBlockConfig.multiSelect && Array.isArray(value)) {
        return { valid: true, value }
      }
      if (typeof value === 'string') {
        return { valid: true, value }
      }
      return {
        valid: false,
        error: {
          blockId,
          blockType,
          field: fieldName,
          value,
          error: `Invalid selector value for field "${fieldName}" - expected a string${subBlockConfig.multiSelect ? ' or array of strings' : ''}`,
        },
      }
    }

    default:
      return { valid: true, value }
  }
}

/**
 * Validates source handle is valid for the block type
 */
export function validateSourceHandleForBlock(
  sourceHandle: string,
  sourceBlockType: string,
  sourceBlock: any
): EdgeHandleValidationResult {
  if (sourceHandle === 'error') {
    return { valid: true }
  }

  switch (sourceBlockType) {
    case 'loop':
      if (sourceHandle === 'loop-start-source' || sourceHandle === 'loop-end-source') {
        return { valid: true }
      }
      return {
        valid: false,
        error: `Invalid source handle "${sourceHandle}" for loop block. Valid handles: loop-start-source, loop-end-source, error`,
      }

    case 'parallel':
      if (sourceHandle === 'parallel-start-source' || sourceHandle === 'parallel-end-source') {
        return { valid: true }
      }
      return {
        valid: false,
        error: `Invalid source handle "${sourceHandle}" for parallel block. Valid handles: parallel-start-source, parallel-end-source, error`,
      }

    case 'condition': {
      const conditionsValue = sourceBlock?.subBlocks?.conditions?.value
      if (!conditionsValue) {
        return {
          valid: false,
          error: `Invalid condition handle "${sourceHandle}" - no conditions defined`,
        }
      }
      return validateConditionHandle(sourceHandle, sourceBlock.id, conditionsValue)
    }

    case 'router':
      if (sourceHandle === 'source' || sourceHandle.startsWith(EDGE.ROUTER_PREFIX)) {
        return { valid: true }
      }
      return {
        valid: false,
        error: `Invalid source handle "${sourceHandle}" for router block. Valid handles: source, ${EDGE.ROUTER_PREFIX}{targetId}, error`,
      }

    case 'router_v2': {
      const routesValue = sourceBlock?.subBlocks?.routes?.value
      if (!routesValue) {
        return {
          valid: false,
          error: `Invalid router handle "${sourceHandle}" - no routes defined`,
        }
      }
      return validateRouterHandle(sourceHandle, sourceBlock.id, routesValue)
    }

    default:
      if (sourceHandle === 'source') {
        return { valid: true }
      }
      return {
        valid: false,
        error: `Invalid source handle "${sourceHandle}" for ${sourceBlockType} block. Valid handles: source, error`,
      }
  }
}

/**
 * Validates condition handle references a valid condition in the block.
 */
export function validateConditionHandle(
  sourceHandle: string,
  blockId: string,
  conditionsValue: string | any[]
): EdgeHandleValidationResult {
  let conditions: any[]
  if (typeof conditionsValue === 'string') {
    try {
      conditions = JSON.parse(conditionsValue)
    } catch {
      return {
        valid: false,
        error: `Cannot validate condition handle "${sourceHandle}" - conditions is not valid JSON`,
      }
    }
  } else if (Array.isArray(conditionsValue)) {
    conditions = conditionsValue
  } else {
    return {
      valid: false,
      error: `Cannot validate condition handle "${sourceHandle}" - conditions is not an array`,
    }
  }

  if (!Array.isArray(conditions) || conditions.length === 0) {
    return {
      valid: false,
      error: `Invalid condition handle "${sourceHandle}" - no conditions defined`,
    }
  }

  const handleToNormalized = new Map<string, string>()
  const legacySemanticPrefix = `condition-${blockId}-`
  let elseIfIndex = 0

  for (const condition of conditions) {
    if (!condition.id) continue

    const normalizedHandle = `condition-${condition.id}`
    const title = condition.title?.toLowerCase()

    handleToNormalized.set(normalizedHandle, normalizedHandle)

    if (title === 'if') {
      handleToNormalized.set('if', normalizedHandle)
      handleToNormalized.set(`${legacySemanticPrefix}if`, normalizedHandle)
    } else if (title === 'else if') {
      handleToNormalized.set(`else-if-${elseIfIndex}`, normalizedHandle)
      if (elseIfIndex === 0) {
        handleToNormalized.set(`${legacySemanticPrefix}else-if`, normalizedHandle)
      } else {
        handleToNormalized.set(
          `${legacySemanticPrefix}else-if-${elseIfIndex + 1}`,
          normalizedHandle
        )
      }
      elseIfIndex++
    } else if (title === 'else') {
      handleToNormalized.set('else', normalizedHandle)
      handleToNormalized.set(`${legacySemanticPrefix}else`, normalizedHandle)
    }
  }

  const normalizedHandle = handleToNormalized.get(sourceHandle)
  if (normalizedHandle) {
    return { valid: true, normalizedHandle }
  }

  const simpleOptions: string[] = []
  elseIfIndex = 0
  for (const condition of conditions) {
    const title = condition.title?.toLowerCase()
    if (title === 'if') {
      simpleOptions.push('if')
    } else if (title === 'else if') {
      simpleOptions.push(`else-if-${elseIfIndex}`)
      elseIfIndex++
    } else if (title === 'else') {
      simpleOptions.push('else')
    }
  }

  return {
    valid: false,
    error: `Invalid condition handle "${sourceHandle}". Valid handles: ${simpleOptions.join(', ')}`,
  }
}

/**
 * Validates router handle references a valid route in the block.
 */
export function validateRouterHandle(
  sourceHandle: string,
  blockId: string,
  routesValue: string | any[]
): EdgeHandleValidationResult {
  let routes: any[]
  if (typeof routesValue === 'string') {
    try {
      routes = JSON.parse(routesValue)
    } catch {
      return {
        valid: false,
        error: `Cannot validate router handle "${sourceHandle}" - routes is not valid JSON`,
      }
    }
  } else if (Array.isArray(routesValue)) {
    routes = routesValue
  } else {
    return {
      valid: false,
      error: `Cannot validate router handle "${sourceHandle}" - routes is not an array`,
    }
  }

  if (!Array.isArray(routes) || routes.length === 0) {
    return {
      valid: false,
      error: `Invalid router handle "${sourceHandle}" - no routes defined`,
    }
  }

  const handleToNormalized = new Map<string, string>()
  const legacySemanticPrefix = `router-${blockId}-`

  for (let i = 0; i < routes.length; i++) {
    const route = routes[i]
    if (!route.id) continue

    const normalizedHandle = `router-${route.id}`
    handleToNormalized.set(normalizedHandle, normalizedHandle)
    handleToNormalized.set(`route-${i}`, normalizedHandle)
    handleToNormalized.set(`${legacySemanticPrefix}route-${i + 1}`, normalizedHandle)

    if (route.title && typeof route.title === 'string') {
      const normalizedTitle = route.title
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
      if (normalizedTitle) {
        handleToNormalized.set(`${legacySemanticPrefix}${normalizedTitle}`, normalizedHandle)
      }
    }
  }

  const normalizedHandle = handleToNormalized.get(sourceHandle)
  if (normalizedHandle) {
    return { valid: true, normalizedHandle }
  }

  const simpleOptions = routes.map((_, i) => `route-${i}`)
  return {
    valid: false,
    error: `Invalid router handle "${sourceHandle}". Valid handles: ${simpleOptions.join(', ')}`,
  }
}

/**
 * Validates target handle is valid (must be 'target')
 */
export function validateTargetHandle(targetHandle: string): EdgeHandleValidationResult {
  if (targetHandle === 'target') {
    return { valid: true }
  }
  return {
    valid: false,
    error: `Invalid target handle "${targetHandle}". Expected "target"`,
  }
}

/**
 * Checks if a block type is allowed by the permission group config
 */
export function isBlockTypeAllowed(
  blockType: string,
  permissionConfig: PermissionGroupConfig
): boolean {
  if (!permissionConfig || permissionConfig.allowedIntegrations === null) {
    return true
  }
  return permissionConfig.allowedIntegrations.includes(blockType.toLowerCase())
}
