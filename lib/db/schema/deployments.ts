/**
 * Deployment feature tables — MCP tools, A2A agents, Chat deployments.
 * Copied from Sim's schema. These tables scaffold future features
 * (MCP tool publishing, A2A protocol, Chat widget deployment).
 */
import {
  boolean,
  integer,
  json,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { workflows } from "./workflows"

// ─── MCP: Workflow-level tool registration ──────────────────────────────────

/** MCP tools — each row = one workflow exposed as a callable tool on an MCP server */
export const workflowMcpTool = pgTable("workflow_mcp_tool", {
  id: text("id").primaryKey(),
  serverId: text("server_id").notNull(), // FK to mcpServers.id
  workflowId: uuid("workflow_id").notNull(),
  toolName: text("tool_name").notNull(),
  toolDescription: text("tool_description"),
  parameterSchema: json("parameter_schema").notNull().default('{}'),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// ─── A2A: Agent-to-Agent protocol ──────────────────────────────────────────

/** A2A agents — workflows exposed as A2A-protocol agents */
export const a2aAgent = pgTable("a2a_agent", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),
  createdBy: text("created_by").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  version: text("version").notNull().default("1.0.0"),
  capabilities: jsonb("capabilities").notNull().default({}),
  skills: jsonb("skills").notNull().default([]),
  authentication: jsonb("authentication").notNull().default({}),
  isPublished: boolean("is_published").notNull().default(false),
  publishedAt: timestamp("published_at"),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

/** A2A tasks — tracks task state for agent interactions */
export const a2aTask = pgTable("a2a_task", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  sessionId: text("session_id"),
  status: text("status").notNull().default("submitted"),
  messages: jsonb("messages").notNull().default([]),
  artifacts: jsonb("artifacts").notNull().default([]),
  executionId: text("execution_id"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
})

/** A2A push notification config — webhook delivery for task updates */
export const a2aPushNotificationConfig = pgTable("a2a_push_notification_config", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull(),
  workflowId: uuid("workflow_id").notNull(),
  url: text("url").notNull(),
  token: text("token"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// ─── Chat: Widget deployment ────────────────────────────────────────────────

/** Chat deployments — workflows exposed as public/protected chat interfaces */
export const chat = pgTable("chat", {
  id: text("id").primaryKey(),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  identifier: text("identifier").notNull(), // unique URL slug
  title: text("title").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  customizations: json("customizations").default('{}'),
  authType: text("auth_type").notNull().default("public"), // 'public' | 'password' | 'email' | 'sso'
  password: text("password"),
  allowedEmails: json("allowed_emails").default('[]'),
  outputConfigs: json("output_configs").default('[]'),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
