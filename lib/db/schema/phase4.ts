/**
 * Phase 4 table stubs — MCP servers, agent memory, skills.
 * Tables exist now so the executor compiles; real data + UI wired in Phase 4.
 */
import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { organization } from "./auth"

/** MCP server connections owned by an org */
export const mcpServers = pgTable(
  "mcp_servers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull().default(""),
    url: text("url").notNull().default(""),
    connectionStatus: text("connection_status").notNull().default("disconnected"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("mcp_servers_org_idx").on(table.orgId)]
)

/** Native agent memory — keyed by (orgId, conversationId) */
export const memory = pgTable(
  "agent_memory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    data: jsonb("data").$type<unknown[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("agent_memory_org_key_idx").on(table.orgId, table.key)]
)

/** Reusable agent skills (prompt snippets) */
export const skill = pgTable(
  "skills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    content: text("content").notNull().default(""),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("skills_org_idx").on(table.orgId)]
)
