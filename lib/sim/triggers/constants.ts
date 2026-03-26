export const TRIGGER_TYPES = ['manual', 'scheduled', 'webhook', 'context_event'] as const
export type TriggerType = (typeof TRIGGER_TYPES)[number]

/** Sub-block IDs that are injected by the system (not user-configured) */
export const SYSTEM_SUBBLOCK_IDS: string[] = []
