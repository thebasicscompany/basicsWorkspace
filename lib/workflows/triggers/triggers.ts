/**
 * Trigger type definitions — copied from Sim's lib/workflows/triggers/triggers.ts
 */

export const TRIGGER_TYPES = {
  INPUT: 'input_trigger',
  MANUAL: 'manual_trigger',
  CHAT: 'chat_trigger',
  API: 'api_trigger',
  WEBHOOK: 'webhook',
  GENERIC_WEBHOOK: 'generic_webhook',
  SCHEDULE: 'schedule',
  START: 'start_trigger',
  STARTER: 'starter', // Legacy
} as const

export type TriggerType = (typeof TRIGGER_TYPES)[keyof typeof TRIGGER_TYPES]

export enum StartBlockPath {
  UNIFIED = 'unified_start',
  LEGACY_STARTER = 'legacy_starter',
  SPLIT_INPUT = 'legacy_input_trigger',
  SPLIT_API = 'legacy_api_trigger',
  SPLIT_CHAT = 'legacy_chat_trigger',
  SPLIT_MANUAL = 'legacy_manual_trigger',
  EXTERNAL_TRIGGER = 'external_trigger',
}

interface ClassifyStartOptions {
  category?: string
  triggerModeEnabled?: boolean
}

export function classifyStartBlockType(
  type: string,
  opts?: ClassifyStartOptions
): StartBlockPath | null {
  switch (type) {
    case TRIGGER_TYPES.START:
      return StartBlockPath.UNIFIED
    case TRIGGER_TYPES.STARTER:
      return StartBlockPath.LEGACY_STARTER
    case TRIGGER_TYPES.INPUT:
      return StartBlockPath.SPLIT_INPUT
    case TRIGGER_TYPES.API:
      return StartBlockPath.SPLIT_API
    case TRIGGER_TYPES.CHAT:
      return StartBlockPath.SPLIT_CHAT
    case TRIGGER_TYPES.MANUAL:
      return StartBlockPath.SPLIT_MANUAL
    case TRIGGER_TYPES.WEBHOOK:
    case TRIGGER_TYPES.SCHEDULE:
      return StartBlockPath.EXTERNAL_TRIGGER
    default:
      if (opts?.category === 'triggers' || opts?.triggerModeEnabled) {
        return StartBlockPath.EXTERNAL_TRIGGER
      }
      return null
  }
}

export function isLegacyStartPath(path: StartBlockPath): boolean {
  return path !== StartBlockPath.UNIFIED
}

// ─── Stubs for features not yet implemented ──────────────────────────────────

export const TriggerUtils = {
  isTriggerBlock: (blockType: string): boolean => {
    return Object.values(TRIGGER_TYPES).includes(blockType as any)
  },
  requiresSingleInstance: (_blockType: string): boolean => false,
  isSingleInstanceBlockType: (_blockType: string): boolean => false,
  findStartBlock: (_blocks: unknown[], _triggerType?: string): unknown => null,
}

export function getLegacyStarterMode(_block: unknown): 'manual' | 'api' | 'chat' | null {
  return null
}

type MinimalBlock = { type: string; subBlocks?: Record<string, unknown> | undefined }

export interface StartBlockCandidate<T extends MinimalBlock = MinimalBlock> {
  blockId: string
  block: T
  path: StartBlockPath
}

export function resolveStartCandidates<T extends MinimalBlock>(
  _blockMap: Record<string, T>,
  _opts?: { execution: string; isChildWorkflow: boolean }
): StartBlockCandidate<T>[] {
  return []
}
