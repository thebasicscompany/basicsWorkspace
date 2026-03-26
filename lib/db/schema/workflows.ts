import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

import { organization, user } from "./auth"

export const workflows = pgTable(
  "workflows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull().default("Untitled Workflow"),
    description: text("description"),
    color: text("color").default("#3B82F6"),
    isDeployed: boolean("is_deployed").default(false),
    deployedAt: timestamp("deployed_at", { withTimezone: true }),
    runCount: integer("run_count").default(0),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    variables: jsonb("variables").$type<Record<string, unknown>>().default({}),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("workflows_org_archived_sort_idx").on(table.orgId, table.archivedAt, table.sortOrder),
  ]
)

export const workflowBlocks = pgTable("workflow_blocks", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  name: text("name").notNull(),
  positionX: numeric("position_x").default("0"),
  positionY: numeric("position_y").default("0"),
  enabled: boolean("enabled").default(true),
  advancedMode: boolean("advanced_mode").default(false),
  triggerMode: boolean("trigger_mode").default(false),
  horizontalHandles: boolean("horizontal_handles").default(true),
  locked: boolean("locked").default(false),
  height: integer("height"),
  subBlocks: jsonb("sub_blocks").$type<Record<string, unknown>>().default({}),
  outputs: jsonb("outputs").$type<Record<string, unknown>>().default({}),
  data: jsonb("data").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const workflowEdges = pgTable("workflow_edges", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),
  sourceBlockId: uuid("source_block_id")
    .notNull()
    .references(() => workflowBlocks.id, { onDelete: "cascade" }),
  targetBlockId: uuid("target_block_id")
    .notNull()
    .references(() => workflowBlocks.id, { onDelete: "cascade" }),
  sourceHandle: text("source_handle"),
  targetHandle: text("target_handle"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

export const workflowSubflows = pgTable("workflow_subflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'loop' | 'parallel'
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

export const workflowExecutionLogs = pgTable(
  "workflow_execution_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workflowId: uuid("workflow_id")
      .notNull()
      .references(() => workflows.id, { onDelete: "cascade" }),
    orgId: text("org_id").notNull(),
    executionId: uuid("execution_id").defaultRandom().notNull(),
    status: text("status").notNull(), // 'running' | 'success' | 'error' | 'cancelled'
    trigger: text("trigger"), // 'manual' | 'scheduled' | 'webhook' | 'context_event'
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    totalDurationMs: integer("total_duration_ms"),
    executionData: jsonb("execution_data").$type<unknown[]>().default([]),
    cost: jsonb("cost").$type<Record<string, unknown>>(),
  },
  (table) => [
    index("workflow_exec_logs_workflow_started_idx").on(table.workflowId, table.startedAt),
    index("workflow_exec_logs_org_started_idx").on(table.orgId, table.startedAt),
  ]
)
