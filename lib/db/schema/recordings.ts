import { pgTable, uuid, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core"

export const recordings = pgTable("recordings", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: text("org_id").notNull(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  status: text("status", {
    enum: ["recording", "recorded", "processing", "converted", "failed"],
  }).notNull().default("recording"),
  events: jsonb("events"),
  structuredActions: jsonb("structured_actions"),
  workflowId: uuid("workflow_id"),
  duration: integer("duration"),
  eventCount: integer("event_count"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})
