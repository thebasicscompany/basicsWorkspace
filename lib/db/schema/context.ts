import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

export const contextEvents = pgTable(
  "context_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id").notNull(),
    userId: text("user_id"),
    sourceApp: text("source_app").notNull(),
    eventType: text("event_type").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    entityName: text("entity_name"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("context_events_org_created_idx").on(table.orgId, table.createdAt),
    index("context_events_entity_idx").on(table.entityType, table.entityId),
    index("context_events_event_type_idx").on(table.eventType),
  ]
)

export const relationships = pgTable(
  "relationships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id").notNull(),
    fromType: text("from_type").notNull(),
    fromId: uuid("from_id").notNull(),
    toType: text("to_type").notNull(),
    toId: uuid("to_id").notNull(),
    relationType: text("relation_type").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("relationships_from_idx").on(table.orgId, table.fromType, table.fromId),
    index("relationships_to_idx").on(table.orgId, table.toType, table.toId),
    uniqueIndex("relationships_unique").on(
      table.orgId,
      table.fromType,
      table.fromId,
      table.toType,
      table.toId,
      table.relationType
    ),
  ]
)
