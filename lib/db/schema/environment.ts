/**
 * Environment variable tables.
 * Copied from Sim's schema structure.
 * - `environment`: Personal env vars per user (encrypted in production)
 * - `workspaceEnvironment`: Shared env vars per workspace/org
 */
import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

import { user } from "./auth"

export const environment = pgTable("environment", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  variables: jsonb("variables").$type<Record<string, string>>().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .$default(() => new Date())
    .notNull(),
})

export const workspaceEnvironment = pgTable("workspace_environment", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: text("org_id").notNull().unique(),
  variables: jsonb("variables").$type<Record<string, string>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .$default(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .$default(() => new Date())
    .notNull(),
})
