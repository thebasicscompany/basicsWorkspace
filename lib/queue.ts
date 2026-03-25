import { PgBoss } from "pg-boss"

declare global {
  // eslint-disable-next-line no-var
  var _queue: PgBoss | undefined
}

export const queue: PgBoss =
  globalThis._queue ?? new PgBoss(process.env.DATABASE_URL!)

if (process.env.NODE_ENV !== "production") {
  globalThis._queue = queue
}

export async function startQueue() {
  await queue.start()
}

// Job type definitions
export type CheckAutomationTriggersJob = {
  eventId: string
  orgId: string
  eventType: string
  entityType: string
  entityId: string
}

export type EmbedEntityJob = {
  orgId: string
  entityType: string
  entityId: string
}

export type RunAutomationJob = {
  workflowId: string
  triggerData: {
    eventType: string
    entityType: string
    entityId: string
    payload: Record<string, unknown>
  }
}
