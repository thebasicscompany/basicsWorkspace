/**
 * Block output resolution — direct port of Sim's lib/workflows/blocks/block-outputs.ts
 *
 * Import paths adapted for basics-workspace. Logic is 1:1 copy of Sim.
 */

import {
  classifyStartBlockType,
  StartBlockPath,
  TRIGGER_TYPES,
} from '@/lib/workflows/triggers/triggers'
import { getBlock } from '@/lib/sim/blocks'
import {
  type BlockConfig,
  isHiddenFromDisplay,
  type OutputCondition,
  type OutputFieldDefinition,
} from '@/lib/sim/blocks/types'
import { getTool } from '@/lib/sim/tools/utils'
import {
  USER_FILE_ACCESSIBLE_PROPERTIES,
  USER_FILE_PROPERTY_TYPES,
} from '@/lib/workflows/types'

// ─── Types (copied from Sim) ─────────────────────────────────────────────────

type OutputDefinition = Record<string, OutputFieldDefinition>

interface SubBlockWithValue {
  value?: unknown
}

interface EffectiveOutputOptions {
  triggerMode?: boolean
  preferToolOutputs?: boolean
  includeHidden?: boolean
}

interface InputFormatField {
  name: string
  type?: string
  description?: string
}

type ConditionValue = string | number | boolean

// ─── Copied from Sim: lib/workflows/input-format.ts ──────────────────────────

function normalizeInputFormatValue(inputFormatValue: unknown): InputFormatField[] {
  if (
    inputFormatValue === null ||
    inputFormatValue === undefined ||
    (Array.isArray(inputFormatValue) && inputFormatValue.length === 0)
  ) {
    return []
  }

  if (!Array.isArray(inputFormatValue)) {
    return []
  }

  return inputFormatValue.filter(
    (field): field is InputFormatField =>
      field &&
      typeof field === 'object' &&
      typeof field.name === 'string' &&
      field.name.trim() !== ''
  )
}

// ─── Copied from Sim: condition evaluation ───────────────────────────────────

function isConditionPrimitive(value: unknown): value is ConditionValue {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

function evaluateOutputCondition(
  condition: OutputCondition,
  subBlocks: Record<string, SubBlockWithValue> | undefined
): boolean {
  if (!subBlocks) return false

  const fieldValue = subBlocks[condition.field]?.value

  let matches: boolean
  if (Array.isArray(condition.value)) {
    matches = isConditionPrimitive(fieldValue) && condition.value.includes(fieldValue)
  } else {
    matches = fieldValue === condition.value
  }

  if (condition.not) {
    matches = !matches
  }

  if (condition.and) {
    const andFieldValue = subBlocks[condition.and.field]?.value
    let andMatches: boolean

    if (Array.isArray(condition.and.value)) {
      const primitiveMatch =
        isConditionPrimitive(andFieldValue) && condition.and.value.includes(andFieldValue)
      const undefinedMatch = andFieldValue === undefined && condition.and.value.includes(undefined)
      const nullMatch = andFieldValue === null && condition.and.value.includes(null)
      andMatches = primitiveMatch || undefinedMatch || nullMatch
    } else {
      andMatches = andFieldValue === condition.and.value
    }

    if (condition.and.not) {
      andMatches = !andMatches
    }

    matches = matches && andMatches
  }

  return matches
}

function filterOutputsByCondition(
  outputs: OutputDefinition,
  subBlocks: Record<string, SubBlockWithValue> | undefined,
  includeHidden = false
): OutputDefinition {
  const filtered: OutputDefinition = {}

  for (const [key, value] of Object.entries(outputs)) {
    if (!includeHidden && isHiddenFromDisplay(value)) continue

    if (!value || typeof value !== 'object' || !('condition' in value)) {
      filtered[key] = value
      continue
    }

    const condition = value.condition as OutputCondition | undefined
    const passes = !condition || evaluateOutputCondition(condition, subBlocks)

    if (passes) {
      if (includeHidden) {
        const { condition: _, ...rest } = value
        filtered[key] = rest
      } else {
        const { condition: _, hiddenFromDisplay: __, ...rest } = value
        filtered[key] = rest
      }
    }
  }

  return filtered
}

// ─── Copied from Sim: start block outputs ────────────────────────────────────

const CHAT_OUTPUTS: OutputDefinition = {
  input: { type: 'string', description: 'User message' },
  conversationId: { type: 'string', description: 'Conversation ID' },
  files: { type: 'file[]', description: 'Uploaded files' },
}

const UNIFIED_START_OUTPUTS: OutputDefinition = {
  input: { type: 'string', description: 'Primary user input or message' },
  conversationId: { type: 'string', description: 'Conversation thread identifier' },
  files: { type: 'file[]', description: 'User uploaded files' },
}

function applyInputFormatFields(
  inputFormat: InputFormatField[],
  outputs: OutputDefinition
): OutputDefinition {
  for (const field of inputFormat) {
    const fieldName = field?.name?.trim()
    if (!fieldName) continue

    outputs[fieldName] = {
      type: (field?.type || 'any') as any,
      description: `Field from input format`,
    }
  }

  return outputs
}

function hasInputFormat(blockConfig: BlockConfig): boolean {
  return blockConfig.subBlocks?.some((sb) => sb.type === 'input-format') || false
}

function getUnifiedStartOutputs(
  subBlocks: Record<string, SubBlockWithValue> | undefined
): OutputDefinition {
  const outputs = { ...UNIFIED_START_OUTPUTS }
  const normalizedInputFormat = normalizeInputFormatValue(subBlocks?.inputFormat?.value)
  return applyInputFormatFields(normalizedInputFormat, outputs)
}

function getLegacyStarterOutputs(
  subBlocks: Record<string, SubBlockWithValue> | undefined
): OutputDefinition {
  const startWorkflowValue = subBlocks?.startWorkflow?.value

  if (startWorkflowValue === 'chat') {
    return { ...CHAT_OUTPUTS }
  }

  if (
    startWorkflowValue === 'api' ||
    startWorkflowValue === 'run' ||
    startWorkflowValue === 'manual'
  ) {
    const normalizedInputFormat = normalizeInputFormatValue(subBlocks?.inputFormat?.value)
    return applyInputFormatFields(normalizedInputFormat, {})
  }

  return {}
}

function shouldClearBaseOutputs(
  blockType: string,
  normalizedInputFormat: InputFormatField[]
): boolean {
  if (blockType === TRIGGER_TYPES.API || blockType === TRIGGER_TYPES.INPUT) {
    return true
  }

  if (blockType === TRIGGER_TYPES.GENERIC_WEBHOOK && normalizedInputFormat.length > 0) {
    return true
  }

  return false
}

function applyInputFormatToOutputs(
  blockType: string,
  blockConfig: BlockConfig,
  subBlocks: Record<string, SubBlockWithValue> | undefined,
  baseOutputs: OutputDefinition
): OutputDefinition {
  if (!hasInputFormat(blockConfig) || !subBlocks?.inputFormat?.value) {
    return baseOutputs
  }

  const normalizedInputFormat = normalizeInputFormatValue(subBlocks.inputFormat.value)

  if (!Array.isArray(subBlocks.inputFormat.value)) {
    if (blockType === TRIGGER_TYPES.API || blockType === TRIGGER_TYPES.INPUT) {
      return {}
    }
    return baseOutputs
  }

  const shouldClear = shouldClearBaseOutputs(blockType, normalizedInputFormat)
  const outputs = shouldClear ? {} : { ...baseOutputs }

  return applyInputFormatFields(normalizedInputFormat, outputs)
}

// ─── Copied from Sim: main output functions ──────────────────────────────────

export function getBlockOutputs(
  blockType: string,
  subBlocks?: Record<string, SubBlockWithValue>,
  triggerMode?: boolean,
  options?: { includeHidden?: boolean }
): OutputDefinition {
  const includeHidden = options?.includeHidden ?? false
  const blockConfig = getBlock(blockType)
  if (!blockConfig) return {}

  // Trigger mode output resolution skipped for now (requires getTrigger/isTriggerValid)
  // In Sim this checks blockConfig.triggers?.enabled and resolves trigger-specific outputs

  const startPath = classifyStartBlockType(blockType)

  if (startPath === StartBlockPath.UNIFIED) {
    return getUnifiedStartOutputs(subBlocks)
  }

  if (blockType === 'human_in_the_loop') {
    const baseOutputs = filterOutputsByCondition(
      { ...(blockConfig.outputs || {}) } as OutputDefinition,
      subBlocks,
      includeHidden
    )

    const normalizedInputFormat = normalizeInputFormatValue(subBlocks?.inputFormat?.value)

    for (const field of normalizedInputFormat) {
      const fieldName = field?.name?.trim()
      if (!fieldName) continue

      baseOutputs[fieldName] = {
        type: (field?.type || 'any') as any,
        description: field?.description || `Field from resume form`,
      }
    }

    return baseOutputs
  }

  if (startPath === StartBlockPath.LEGACY_STARTER) {
    return getLegacyStarterOutputs(subBlocks)
  }

  const baseOutputs = { ...(blockConfig.outputs || {}) }
  const filteredOutputs = filterOutputsByCondition(baseOutputs, subBlocks, includeHidden)
  return applyInputFormatToOutputs(blockType, blockConfig, subBlocks, filteredOutputs)
}

export function getResponseFormatOutputs(
  subBlocks?: Record<string, SubBlockWithValue>,
  _blockId = 'block'
): OutputDefinition | undefined {
  const responseFormatValue = subBlocks?.responseFormat?.value
  if (!responseFormatValue) return undefined

  // Try to parse JSON schema from response format
  let parsed: any
  try {
    parsed = typeof responseFormatValue === 'string'
      ? JSON.parse(responseFormatValue)
      : responseFormatValue
  } catch {
    return undefined
  }

  if (!parsed || typeof parsed !== 'object') return undefined

  // Extract fields from schema properties
  const properties = parsed.properties || parsed.schema?.properties
  if (!properties || typeof properties !== 'object') return undefined

  const outputs: OutputDefinition = {}
  for (const [name, def] of Object.entries(properties)) {
    const fieldDef = def as any
    outputs[name] = {
      type: (fieldDef?.type || 'any') as any,
      description: fieldDef?.description || `Field from response format: ${name}`,
    }
  }

  return Object.keys(outputs).length > 0 ? outputs : undefined
}

export function getEvaluatorMetricOutputs(
  subBlocks?: Record<string, SubBlockWithValue>
): OutputDefinition | undefined {
  const metricsValue = subBlocks?.metrics?.value
  if (!metricsValue || !Array.isArray(metricsValue) || metricsValue.length === 0) return undefined

  const validMetrics = metricsValue.filter((metric: { name?: string }) => metric?.name)
  if (validMetrics.length === 0) return undefined

  const outputs: OutputDefinition = {}
  for (const metric of validMetrics as Array<{ name: string }>) {
    outputs[metric.name.toLowerCase()] = {
      type: 'number',
      description: `Metric score: ${metric.name}`,
    }
  }

  return outputs
}

export function getEffectiveBlockOutputs(
  blockType: string,
  subBlocks?: Record<string, SubBlockWithValue>,
  options?: EffectiveOutputOptions
): OutputDefinition {
  const triggerMode = options?.triggerMode ?? false
  const preferToolOutputs = options?.preferToolOutputs ?? !triggerMode
  const includeHidden = options?.includeHidden ?? false

  if (blockType === 'agent') {
    const responseFormatOutputs = getResponseFormatOutputs(subBlocks, 'agent')
    if (responseFormatOutputs) return responseFormatOutputs
  }

  let baseOutputs: OutputDefinition
  if (triggerMode) {
    baseOutputs = getBlockOutputs(blockType, subBlocks, true, { includeHidden })
  } else if (preferToolOutputs) {
    const blockConfig = getBlock(blockType)
    const toolOutputs = blockConfig
      ? (getToolOutputs(blockConfig, subBlocks, { includeHidden }) as OutputDefinition)
      : {}
    baseOutputs =
      toolOutputs && Object.keys(toolOutputs).length > 0
        ? toolOutputs
        : getBlockOutputs(blockType, subBlocks, false, { includeHidden })
  } else {
    baseOutputs = getBlockOutputs(blockType, subBlocks, false, { includeHidden })
  }

  if (blockType === 'evaluator') {
    const metricOutputs = getEvaluatorMetricOutputs(subBlocks)
    if (metricOutputs) {
      return { ...baseOutputs, ...metricOutputs }
    }
  }

  return baseOutputs
}

// ─── Copied from Sim: path generation ────────────────────────────────────────

// Sim has file type expansion and reserved field filtering. We include simplified versions.

const START_BLOCK_RESERVED_FIELDS = ['input', 'conversationId', 'files'] as const

function shouldFilterReservedField(
  blockType: string,
  key: string,
  prefix: string,
  subBlocks: Record<string, SubBlockWithValue> | undefined
): boolean {
  if (blockType !== TRIGGER_TYPES.START || prefix) {
    return false
  }

  if (!(START_BLOCK_RESERVED_FIELDS as readonly string[]).includes(key)) {
    return false
  }

  const normalizedInputFormat = normalizeInputFormatValue(subBlocks?.inputFormat?.value)
  const isExplicitlyDefined = normalizedInputFormat.some((field) => field?.name?.trim() === key)

  return !isExplicitlyDefined
}

function generateOutputPaths(outputs: Record<string, any>, prefix = ''): string[] {
  const paths: string[] = []

  for (const [key, value] of Object.entries(outputs)) {
    const currentPath = prefix ? `${prefix}.${key}` : key

    if (typeof value === 'string') {
      paths.push(currentPath)
    } else if (typeof value === 'object' && value !== null) {
      if ('type' in value && typeof value.type === 'string') {
        // File types: expand to sub-properties
        if (value.type === 'file' || value.type === 'file[]') {
          paths.push(`${currentPath}.name`)
          paths.push(`${currentPath}.type`)
          paths.push(`${currentPath}.size`)
          paths.push(`${currentPath}.data`)
          continue
        }

        const hasNestedProperties =
          ((value.type === 'object' || value.type === 'json') && value.properties) ||
          (value.type === 'array' && value.items?.properties) ||
          (value.type === 'array' &&
            value.items &&
            typeof value.items === 'object' &&
            !('type' in value.items))

        if (!hasNestedProperties) {
          paths.push(currentPath)
        }

        if ((value.type === 'object' || value.type === 'json') && value.properties) {
          paths.push(...generateOutputPaths(value.properties, currentPath))
        } else if (value.type === 'array' && value.items?.properties) {
          paths.push(...generateOutputPaths(value.items.properties, currentPath))
        } else if (
          value.type === 'array' &&
          value.items &&
          typeof value.items === 'object' &&
          !('type' in value.items)
        ) {
          paths.push(...generateOutputPaths(value.items, currentPath))
        }
      } else {
        const subPaths = generateOutputPaths(value, currentPath)
        paths.push(...subPaths)
      }
    } else {
      paths.push(currentPath)
    }
  }

  return paths
}

export function getEffectiveBlockOutputPaths(
  blockType: string,
  subBlocks?: Record<string, SubBlockWithValue>,
  options?: EffectiveOutputOptions
): string[] {
  const outputs = getEffectiveBlockOutputs(blockType, subBlocks, options)
  const paths = generateOutputPaths(outputs)

  if (blockType === TRIGGER_TYPES.START) {
    return paths.filter((path) => {
      const key = path.split('.')[0]
      return !shouldFilterReservedField(blockType, key, '', subBlocks)
    })
  }

  return paths
}

// ─── Copied from Sim: tool outputs ───────────────────────────────────────────

function getToolOutputs(
  blockConfig: BlockConfig,
  subBlocks?: Record<string, SubBlockWithValue>,
  options?: { includeHidden?: boolean }
): Record<string, any> {
  const includeHidden = options?.includeHidden ?? false
  if (!blockConfig?.tools?.config?.tool) return {}

  try {
    const params: Record<string, any> = {}
    if (subBlocks) {
      for (const [key, subBlock] of Object.entries(subBlocks)) {
        params[key] = subBlock.value
      }
    }

    const toolId = blockConfig.tools.config.tool(params)
    if (!toolId || typeof toolId !== 'string') return {}

    const toolConfig = getTool(toolId)
    if (!toolConfig?.outputs) return {}
    if (includeHidden) {
      return toolConfig.outputs
    }
    return Object.fromEntries(
      Object.entries(toolConfig.outputs).filter(([_, def]) => !isHiddenFromDisplay(def))
    )
  } catch {
    return {}
  }
}

// ─── File type helpers (copied from Sim) ──────────────────────────────────

function expandFileTypeProperties(path: string): string[] {
  return USER_FILE_ACCESSIBLE_PROPERTIES.map((prop) => `${path}.${prop}`)
}

type FileOutputType = 'file' | 'file[]'

function isFileOutputDefinition(value: unknown): value is { type: FileOutputType } {
  if (!value || typeof value !== 'object' || !('type' in value)) {
    return false
  }
  const { type } = value as { type?: unknown }
  return type === 'file' || type === 'file[]'
}

function getFilePropertyType(outputs: OutputDefinition, pathParts: string[]): string | null {
  const lastPart = pathParts[pathParts.length - 1]
  if (!lastPart || !USER_FILE_PROPERTY_TYPES[lastPart as keyof typeof USER_FILE_PROPERTY_TYPES]) {
    return null
  }

  let current: unknown = outputs
  for (const part of pathParts.slice(0, -1)) {
    if (!current || typeof current !== 'object') {
      return null
    }
    current = (current as Record<string, unknown>)[part]
  }

  if (isFileOutputDefinition(current)) {
    return USER_FILE_PROPERTY_TYPES[lastPart as keyof typeof USER_FILE_PROPERTY_TYPES]
  }

  return null
}

function traverseOutputPath(outputs: OutputDefinition, pathParts: string[]): unknown {
  let current: unknown = outputs

  for (const part of pathParts) {
    if (!current || typeof current !== 'object') {
      return null
    }

    const currentObj = current as Record<string, unknown>

    if (part in currentObj) {
      current = currentObj[part]
    } else if (
      'type' in currentObj &&
      currentObj.type === 'object' &&
      'properties' in currentObj &&
      currentObj.properties &&
      typeof currentObj.properties === 'object'
    ) {
      const props = currentObj.properties as Record<string, unknown>
      if (part in props) {
        current = props[part]
      } else {
        return null
      }
    } else if (
      'type' in currentObj &&
      currentObj.type === 'array' &&
      'items' in currentObj &&
      currentObj.items &&
      typeof currentObj.items === 'object'
    ) {
      const items = currentObj.items as Record<string, unknown>
      if ('properties' in items && items.properties && typeof items.properties === 'object') {
        const itemProps = items.properties as Record<string, unknown>
        if (part in itemProps) {
          current = itemProps[part]
        } else {
          return null
        }
      } else {
        return null
      }
    } else {
      return null
    }
  }

  return current
}

function extractType(value: unknown): string {
  if (!value) return 'any'

  if (typeof value === 'object' && 'type' in value) {
    const typeValue = (value as { type: unknown }).type
    return typeof typeValue === 'string' ? typeValue : 'any'
  }

  return typeof value === 'string' ? value : 'any'
}

// ─── Exported functions needed by tag-dropdown ────────────────────────────

export function getEffectiveBlockOutputType(
  blockType: string,
  outputPath: string,
  subBlocks?: Record<string, SubBlockWithValue>,
  options?: EffectiveOutputOptions
): string {
  const outputs = getEffectiveBlockOutputs(blockType, subBlocks, options)

  const cleanPath = outputPath.replace(/\[(\d+)\]/g, '')
  const pathParts = cleanPath.split('.').filter(Boolean)

  const filePropertyType = getFilePropertyType(outputs, pathParts)
  if (filePropertyType) {
    return filePropertyType
  }

  const value = traverseOutputPath(outputs, pathParts)
  return extractType(value)
}

export function getOutputPathsFromSchema(outputs: Record<string, any>): string[] {
  return generateOutputPaths(outputs)
}
