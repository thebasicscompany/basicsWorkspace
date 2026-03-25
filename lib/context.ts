import { db } from "./db"
import { contextEvents } from "./db/schema"
import { queue } from "./queue"

export async function logContextEvent(event: {
  orgId: string
  userId?: string
  sourceApp: string
  eventType: string
  entityType: string
  entityId: string
  entityName?: string
  metadata?: Record<string, unknown>
}) {
  // 1. Append to event log — awaited (must be durable before we return)
  const [row] = await db
    .insert(contextEvents)
    .values({
      orgId: event.orgId,
      userId: event.userId,
      sourceApp: event.sourceApp,
      eventType: event.eventType,
      entityType: event.entityType,
      entityId: event.entityId as `${string}-${string}-${string}-${string}-${string}`,
      entityName: event.entityName,
      metadata: event.metadata,
    })
    .returning()

  // 2 & 3. Queue jobs fire-and-forget — do NOT await.
  // API response time must not be held hostage to queue latency.
  // PgBoss guarantees delivery even if the process crashes immediately after.
  void queue.send("check-automation-triggers", {
    eventId: row.id,
    orgId: event.orgId,
    eventType: event.eventType,
    entityType: event.entityType,
    entityId: event.entityId,
  })
  void queue.send("embed-entity", {
    orgId: event.orgId,
    entityType: event.entityType,
    entityId: event.entityId,
  })

  return row
}
