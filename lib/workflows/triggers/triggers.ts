// Phase 3F stub — workflow trigger registry
export type TriggerType = 'manual' | 'scheduled' | 'webhook' | 'context_event'

export interface Trigger {
  id: string
  type: TriggerType
  workflowId: string
  config: Record<string, unknown>
}

export async function getTriggersForWorkflow(_workflowId: string): Promise<Trigger[]> {
  return []
}

export async function upsertTrigger(_trigger: Omit<Trigger, 'id'>): Promise<Trigger> {
  throw new Error('Trigger management not yet implemented (Phase 3F)')
}

/** Path constants used when a trigger block resolves start block execution path.
 *  Defined as an enum so it is usable as both a value (StartBlockPath.SPLIT_MANUAL)
 *  and a type (path: StartBlockPath). */
export enum StartBlockPath {
  SPLIT_MANUAL = 'split_manual',
  SPLIT_AUTO = 'split_auto',
  SINGLE = 'single',
  UNIFIED = 'unified',
  SPLIT_API = 'split_api',
  SPLIT_INPUT = 'split_input',
  SPLIT_CHAT = 'split_chat',
  EXTERNAL_TRIGGER = 'external_trigger',
  LEGACY_STARTER = 'legacy_starter',
}

/** Utility helpers for trigger block operations */
export const TriggerUtils = {
  isTriggerBlock: (_blockType: string): boolean => false,
  requiresSingleInstance: (_blockType: string): boolean => false,
  isSingleInstanceBlockType: (_blockType: string): boolean => false,
  findStartBlock: (_blocks: unknown[], _triggerType?: string): unknown => null,
}

/** Classify a block's start type based on its configuration */
export function classifyStartBlockType(
  _blockType: string,
  _opts?: { category?: string; triggerModeEnabled?: boolean }
): StartBlockPath | null {
  return null
}

/** Get the legacy starter mode for older workflow formats */
export function getLegacyStarterMode(_block: unknown): 'manual' | 'api' | 'chat' | null {
  return null
}

/** Resolve candidate start blocks from a block map with execution options */
export function resolveStartCandidates(
  _blockMap: Record<string, unknown>,
  _opts?: { execution: string; isChildWorkflow: boolean }
): { blockId: string; block: { original: any }; path: StartBlockPath }[] {
  return []
}
