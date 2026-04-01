/**
 * Workspace tools registry.
 *
 * Centralized tool definitions that can be used by any agent surface:
 * - Agent chat (/api/agent/chat)
 * - Voice assistant
 * - Copilot
 * - Automation blocks
 *
 * Usage:
 *   import { getAISDKTools } from "@/lib/workspace-tools"
 *
 *   const result = streamText({
 *     model: ...,
 *     tools: getAISDKTools(ctx),
 *   })
 */
import { tool as aiTool, zodSchema } from "ai"
import type { ToolContext, WorkspaceTool } from "./types"

// ── Import all tool modules ──────────────────────────────────────────────────

import {
  listObjectTypes,
  searchRecords,
  getRecord,
  createRecord,
  updateRecord,
  deleteRecord,
} from "./tools/records"

import {
  listWorkflows,
  getWorkflowLogs,
} from "./tools/workflows"

// ── Registry ─────────────────────────────────────────────────────────────────

/** All workspace tools, in order of priority/usefulness */
export const ALL_TOOLS: WorkspaceTool[] = [
  // Records (generic — works with any object type)
  listObjectTypes,
  searchRecords,
  getRecord,
  createRecord,
  updateRecord,
  deleteRecord,
  // Workflows
  listWorkflows,
  getWorkflowLogs,
]

/** Get a tool by ID */
export function getWorkspaceTool(id: string): WorkspaceTool | undefined {
  return ALL_TOOLS.find((t) => t.id === id)
}

/**
 * Convert workspace tools to AI SDK `tools` format for use with `streamText()`.
 * Binds the ToolContext so each tool.execute receives (params, ctx).
 *
 * @param ctx - Authenticated user/org context
 * @param include - Optional list of tool IDs to include (default: all)
 */
export function getAISDKTools(
  ctx: ToolContext,
  include?: string[]
): Record<string, any> {
  const tools: Record<string, any> = {}

  for (const t of ALL_TOOLS) {
    if (include && !include.includes(t.id)) continue

    tools[t.id] = aiTool({
      description: t.description,
      inputSchema: zodSchema(t.parameters),
      execute: async (params: any) => t.execute(params, ctx),
    })
  }

  return tools
}

// Re-export types
export type { ToolContext, WorkspaceTool } from "./types"
