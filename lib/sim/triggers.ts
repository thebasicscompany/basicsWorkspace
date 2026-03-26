/**
 * Phase 3F stub — trigger type registry.
 * Real implementations wired in Phase 3F (context_trigger, webhook, cron).
 */
import type { SubBlockConfig } from '@/lib/sim/blocks/types'

export type TriggerType = 'manual' | 'scheduled' | 'webhook' | 'context_event'

export interface TriggerDefinition {
  id: string
  name: string
  type: TriggerType
  description?: string
  subBlocks: SubBlockConfig[]
}

export const TRIGGER_DEFINITIONS: TriggerDefinition[] = []

// Returns an empty trigger so block spreads don't throw at runtime
const EMPTY_TRIGGER: TriggerDefinition = {
  id: '',
  name: '',
  type: 'webhook',
  subBlocks: [],
}

export function getTrigger(_type: string): TriggerDefinition {
  return EMPTY_TRIGGER
}
