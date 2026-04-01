import type { z } from "zod"

/**
 * Context passed to every workspace tool at execution time.
 * Contains the authenticated user/org info so tools can query scoped data.
 */
export interface ToolContext {
  orgId: string
  userId: string
}

/**
 * A workspace tool definition. Used by agent chat, voice assistant,
 * copilot, and automation blocks — any surface that needs to interact
 * with workspace data.
 */
export interface WorkspaceTool {
  /** Unique tool ID (e.g. "search_records", "create_record") */
  id: string
  /** Human-readable name shown to the LLM */
  name: string
  /** Description of what the tool does — fed into tool_use prompt */
  description: string
  /** Zod schema for parameters */
  parameters: z.ZodType
  /** Execute the tool. Returns any JSON-serializable result. */
  execute: (params: any, ctx: ToolContext) => Promise<unknown>
}
