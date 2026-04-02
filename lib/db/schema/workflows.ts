import {
  boolean,
  index,
  integer,
  json,
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
    index("workflows_org_deployed_idx").on(table.orgId, table.isDeployed),
  ]
)

export const workflowBlocks = pgTable(
  "workflow_blocks",
  {
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
  },
  (table) => [
    index("workflow_blocks_workflow_id_idx").on(table.workflowId),
  ]
)

export const workflowEdges = pgTable(
  "workflow_edges",
  {
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
  },
  (table) => [
    index("workflow_edges_workflow_id_idx").on(table.workflowId),
  ]
)

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
    executionState: jsonb("execution_state").$type<Record<string, unknown>>(),
    cost: jsonb("cost").$type<Record<string, unknown>>(),
  },
  (table) => [
    index("workflow_exec_logs_workflow_started_idx").on(table.workflowId, table.startedAt),
    index("workflow_exec_logs_org_started_idx").on(table.orgId, table.startedAt),
    index("workflow_exec_logs_started_idx").on(table.startedAt),
  ]
)

// --- Phase 3E: Trigger Runtime tables (copied from Sim) ---

export const workflowDeploymentVersion = pgTable("workflow_deployment_version", {
  id: text("id").primaryKey(),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(1),
  state: jsonb("state").$type<Record<string, unknown>>(),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by"),
  deployedBy: text("deployed_by"),
  name: text("name"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

export const webhook = pgTable("webhook", {
  id: text("id").primaryKey(),
  workflowId: uuid("workflow_id").notNull(),
  deploymentVersionId: text("deployment_version_id"),
  blockId: text("block_id"),
  path: text("path").notNull(),
  provider: text("provider"),
  providerConfig: json("provider_config"),
  isActive: boolean("is_active").notNull().default(true),
  failedCount: integer("failed_count").default(0),
  lastFailedAt: timestamp("last_failed_at"),
  credentialSetId: text("credential_set_id"),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const workflowSchedule = pgTable("workflow_schedule", {
  id: text("id").primaryKey(),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),
  blockId: text("block_id").notNull(),
  cronExpression: text("cron_expression").notNull(),
  timezone: text("timezone").notNull().default("UTC"),
  // Execution tracking (matches Sim's approach)
  nextRunAt: timestamp("next_run_at", { withTimezone: true }),
  lastRanAt: timestamp("last_ran_at", { withTimezone: true }),
  lastQueuedAt: timestamp("last_queued_at", { withTimezone: true }),
  lastFailedAt: timestamp("last_failed_at", { withTimezone: true }),
  // Status: 'active', 'disabled', 'completed'
  status: text("status").notNull().default("active"),
  failedCount: integer("failed_count").notNull().default(0),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})
