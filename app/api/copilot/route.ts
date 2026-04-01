import { createOpenAI } from '@ai-sdk/openai'
import { streamText, convertToModelMessages, tool, zodSchema, stepCountIs } from 'ai'
import type { UIMessage } from 'ai'
import { z } from 'zod'
import { eq, and, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { workflows, workflowBlocks, workflowEdges, workflowExecutionLogs } from '@/lib/db/schema/workflows'
import { applyOperationsToWorkflowState } from '@/lib/copilot/edit-workflow'
import type { EditWorkflowOperation } from '@/lib/copilot/edit-workflow'
import {
  loadWorkflowStateForCopilot,
  serializeWorkflowState,
  buildBlockRegistrySummary,
  getBlocksMetadata,
} from '@/lib/copilot/workflow-context'
import { getBlock, getAllBlocks } from '@/lib/sim/blocks/registry'
import { requireOrg } from '@/lib/auth-helpers'
import { getEffectiveEnvVars } from '@/lib/environment/utils.server'
import { apiBlockToBlockState } from '@/apps/automations/stores/workflows/utils'
import type { BlockState as SerializerBlockState } from '@/apps/automations/stores/workflow-types'
import { Serializer } from '@/lib/sim/serializer'
import { Executor } from '@/lib/sim/executor'

const gatewayBase = process.env.GATEWAY_URL ?? 'https://api.basicsos.com'
const gateway = createOpenAI({
  baseURL: `${gatewayBase}/v1`,
  apiKey: process.env.GATEWAY_API_KEY ?? '',
  name: 'basics-gateway',
})

const SYSTEM_PROMPT = `You are the Basics OS workflow copilot. You help users build and modify workflow automations by adding blocks, connecting them, and configuring their inputs.

## How workflows work
- A workflow is a directed acyclic graph of blocks connected by edges
- Each block has a **type** (e.g. "agent", "api", "function", "condition"), **inputs** (called subBlocks), and **outputs**
- Blocks connect via edges: source block's output handle → target block's input
- The executor runs blocks in topological order following the edges
- Start/trigger blocks are entry points. Common ones: "start_trigger", "schedule", "generic_webhook"
- Loop and parallel blocks are containers that hold child blocks

## Tag syntax — referencing values in input fields
- **Block output references:** \`<BlockName.field>\` (angle brackets). Example: if block "Research Agent" outputs "content", use \`<Research Agent.content>\` in another block's input.
- **Environment variables:** \`{{VAR_NAME}}\` (double curly braces). Example: \`{{API_KEY}}\`, \`{{SLACK_TOKEN}}\`.
- **Workflow variables:** \`<variable.name>\` where "name" is the variable key.

These are distinct syntaxes — never mix them. Block refs always use angle brackets, env vars always use double curly braces.

## Your tools

### get_blocks_metadata
Call this FIRST when the user asks to add a block type you haven't used before. It returns the full input schema, output fields, and best practices for that block type. This avoids guessing at input field names.

### edit_workflow
Modifies the current workflow. Accepts an array of operations:

**add** — Create a new block
- params: { type (required), name (required), inputs: { fieldId: value }, connections: { "source": "target-block-id" } }
- Use human-readable block_id like "my_agent" — auto-converted to UUID

**edit** — Modify an existing block (use the UUID from current state as block_id)
- params: { name, inputs, connections, removeEdges, enabled, triggerMode }

**delete** — Remove a block and all its edges

**insert_into_subflow** — Add/move a block into a loop/parallel container
- params: { subflowId, type, name }

**extract_from_subflow** — Pull a block out of a container
- params: { subflowId }

#### edit_workflow examples

Example 1 — Add a single agent block connected to an existing start block:
\`\`\`json
{ "operations": [{
    "operation_type": "add",
    "block_id": "summarizer",
    "params": {
      "type": "agent",
      "name": "Summarizer",
      "inputs": {
        "model": "basics-chat-smart-openai",
        "messages": [{"role": "system", "content": "Summarize the input concisely."},
                     {"role": "user", "content": "<Start Trigger.input>"}]
      },
      "connections": { "source": "<start-block-uuid>" }
    }
}]}
\`\`\`

Example 2 — Edit an existing block's inputs:
\`\`\`json
{ "operations": [{
    "operation_type": "edit",
    "block_id": "<existing-block-uuid>",
    "params": {
      "inputs": { "model": "basics-chat-fast-openai" }
    }
}]}
\`\`\`

Example 3 — Add two blocks in one call:
\`\`\`json
{ "operations": [
  { "operation_type": "add", "block_id": "fetcher", "params": { "type": "api", "name": "Fetcher", "inputs": { "url": "https://api.example.com/data", "method": "GET" } } },
  { "operation_type": "add", "block_id": "processor", "params": { "type": "function", "name": "Processor", "inputs": { "code": "return { result: input.data.length };" }, "connections": { "source": "fetcher" } } }
]}
\`\`\`

### run_workflow
Executes the current workflow and returns the result. Use this when the user asks to test or run their workflow. Optionally accepts runFromBlockId to re-run from a specific block using the last execution snapshot.

### get_block_outputs
Returns the available output fields for blocks in the current workflow. Use this to tell the user what \`<BlockName.field>\` tags are available.

### get_trigger_blocks
Lists all block types that can serve as triggers/entry points for workflows.

### get_execution_summary
Returns a summary of recent workflow executions — status, duration, trigger type.

### get_workflow_logs
Returns block-level execution detail for a specific execution ID.

## Top 5 block types — quick reference

**agent** — LLM call. Inputs: messages (messages-input), model (dropdown), systemPrompt (long-input), temperature (slider). Outputs: content, model, tokens.
**api** — HTTP request. Inputs: url (short-input), method (dropdown), headers (table), body (code). Outputs: data, status, headers.
**function** — JS code execution. Inputs: code (code). Outputs: result, stdout.
**condition** — Conditional branching. Inputs: conditions (condition-input). Outputs: conditionResult, selectedPath, selectedOption. Edge handles: condition-{conditionId}.
**start_trigger** — Entry point. Inputs: input (long-input). Outputs: input.

## Common workflow patterns

### Simple agent pipeline
Start Trigger → Agent (with system prompt + model) → Function (process output)

### API integration
Start Trigger → API block (fetch data) → Agent (analyze with \`<Fetcher.data>\`) → Slack/Gmail (send result)

### Conditional routing
Start Trigger → Agent → Condition (check \`<Agent.content>\`) → [If branch] / [Else branch]

## Rules
1. ALWAYS call get_blocks_metadata for ALL block types you plan to use BEFORE calling edit_workflow. Do not guess input field names.
2. When creating multi-block workflows, create ALL blocks in a single edit_workflow call with connections
3. Explain what you're building before calling tools
4. For agent blocks: the input is "messages" (type messages-input, an array of {role, content}), not "systemPrompt". Always look up the block first.
5. Use "basics-chat-smart-openai" as the default model for agent blocks
6. Use \`<BlockName.field>\` for block output references, \`{{VAR}}\` for env vars only — never confuse these
`

function buildSystemPromptWithContext(
  workflowState: string,
  blockRegistry: string
): string {
  return `${SYSTEM_PROMPT}

## Current workflow state
${workflowState || 'Empty workflow (no blocks yet)'}

## Available block types (use get_blocks_metadata to look up input details)
${blockRegistry}
`
}

export async function POST(req: Request) {
  // Auth check
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx

  const body = await req.json()
  const { messages, workflowId }: { messages: UIMessage[]; workflowId: string } = body

  if (!workflowId) {
    return new Response(JSON.stringify({ error: 'workflowId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(workflowId)) {
    return new Response(JSON.stringify({ error: 'Invalid workflowId format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Verify workflow belongs to the user's org
  const [workflow] = await db
    .select({ orgId: workflows.orgId })
    .from(workflows)
    .where(eq(workflows.id, workflowId as `${string}-${string}-${string}-${string}-${string}`))
    .limit(1)

  if (!workflow) {
    return new Response(JSON.stringify({ error: 'Workflow not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (workflow.orgId !== ctx.orgId) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Load current workflow state
  let workflowState: Awaited<ReturnType<typeof loadWorkflowStateForCopilot>>
  try {
    workflowState = await loadWorkflowStateForCopilot(workflowId)
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to load workflow' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const serializedState = serializeWorkflowState(workflowState)
  const blockRegistry = buildBlockRegistrySummary()
  const systemPrompt = buildSystemPromptWithContext(serializedState, blockRegistry)

  const result = streamText({
    model: gateway.chat('basics-chat-smart-openai'),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools: {
      get_blocks_metadata: tool({
        description:
          'Look up detailed input schemas, output fields, and best practices for specific block types. Call this before adding a block type you have not used before.',
        inputSchema: zodSchema(
          z.object({
            block_types: z
              .array(z.string())
              .describe('Array of block type IDs to look up, e.g. ["agent", "api", "function"]'),
          })
        ),
        execute: async ({ block_types }) => {
          return getBlocksMetadata(block_types)
        },
      }),
      edit_workflow: tool({
        description:
          'Modify the current workflow by adding, editing, deleting, or connecting blocks. Always call get_blocks_metadata first for unfamiliar block types.',
        inputSchema: zodSchema(
          z.object({
            operations: z.array(
              z.object({
                operation_type: z
                  .enum([
                    'add',
                    'edit',
                    'delete',
                    'insert_into_subflow',
                    'extract_from_subflow',
                  ])
                  .describe('The operation to perform'),
                block_id: z
                  .string()
                  .describe(
                    'For add: a human-readable ID (auto-converted to UUID). For edit/delete: the existing block UUID.'
                  ),
                params: z
                  .object({
                    type: z
                      .string()
                      .optional()
                      .describe('Block type (e.g. "agent", "api", "function"). Required for add.'),
                    name: z
                      .string()
                      .optional()
                      .describe('Block display name. Required for add.'),
                    inputs: z
                      .record(z.string(), z.any())
                      .optional()
                      .describe('Input values keyed by subBlock id'),
                    connections: z
                      .record(z.string(), z.any())
                      .optional()
                      .describe(
                        'Edges from this block. Keys are source handles, values are target block IDs.'
                      ),
                    removeEdges: z
                      .array(
                        z.object({
                          targetBlockId: z.string(),
                          sourceHandle: z.string().optional(),
                        })
                      )
                      .optional(),
                    subflowId: z
                      .string()
                      .optional()
                      .describe('Parent loop/parallel block ID (for insert_into_subflow)'),
                    enabled: z.boolean().optional(),
                    triggerMode: z.boolean().optional(),
                  })
                  .optional()
                  .describe('Operation parameters'),
              })
            ),
          })
        ),
        execute: async ({ operations }) => {
          try {
            // Normalize: LLM sometimes puts type/name at operation level instead of in params
            const normalizedOps = operations.map((op: any) => {
              if (op.params) return op
              const { operation_type, block_id, ...rest } = op
              if (Object.keys(rest).length > 0) {
                return { operation_type, block_id, params: rest }
              }
              return op
            })

            // Re-load fresh state to avoid stale data
            const freshState = await loadWorkflowStateForCopilot(workflowId)

            const {
              state: modifiedState,
              validationErrors,
              skippedItems,
            } = applyOperationsToWorkflowState(
              freshState as Record<string, unknown>,
              normalizedOps as EditWorkflowOperation[]
            )

            // Persist the modified state back to DB
            await persistWorkflowState(workflowId, modifiedState)

            const blockCount = Object.keys(modifiedState.blocks || {}).length
            const edgeCount = (modifiedState.edges || []).length

            return {
              success: true,
              summary: `Workflow updated: ${blockCount} blocks, ${edgeCount} edges`,
              ...(validationErrors.length > 0 && {
                warnings: validationErrors.map((e: any) => e.error),
              }),
              ...(skippedItems.length > 0 && {
                skipped: skippedItems.map((s: any) => s.reason),
              }),
            }
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            }
          }
        },
      }),
      run_workflow: tool({
        description:
          'Execute the current workflow and return the result. Use when the user wants to test or run the workflow. Optionally pass runFromBlockId to re-run from a specific block.',
        inputSchema: zodSchema(
          z.object({
            runFromBlockId: z
              .string()
              .optional()
              .describe('Block UUID to re-run from (uses last execution snapshot)'),
          })
        ),
        execute: async ({ runFromBlockId }) => {
          try {
            // Load workflow
            const [workflow] = await db
              .select()
              .from(workflows)
              .where(eq(workflows.id, workflowId as `${string}-${string}-${string}-${string}-${string}`))
              .limit(1)

            if (!workflow) return { success: false, error: 'Workflow not found' }

            // Load blocks + edges
            const apiBlocks = await db
              .select()
              .from(workflowBlocks)
              .where(eq(workflowBlocks.workflowId, workflowId as `${string}-${string}-${string}-${string}-${string}`))

            const apiEdges = await db
              .select()
              .from(workflowEdges)
              .where(eq(workflowEdges.workflowId, workflowId as `${string}-${string}-${string}-${string}-${string}`))

            // Convert to executor-compatible shapes
            const blockStates: Record<string, SerializerBlockState> = {}
            for (const ab of apiBlocks) {
              const bs = apiBlockToBlockState(ab) as unknown as SerializerBlockState
              blockStates[bs.id] = bs
            }

            const edges = apiEdges.map((e) => ({
              id: e.id,
              source: e.sourceBlockId,
              target: e.targetBlockId,
              sourceHandle: e.sourceHandle ?? undefined,
              targetHandle: e.targetHandle ?? undefined,
            }))

            const serializer = new Serializer()
            const serialized = serializer.serializeWorkflow(blockStates, edges)

            const envVarValues = await getEffectiveEnvVars(workflow.userId)
            const executor = new Executor({
              workflow: serialized,
              envVarValues,
              workflowVariables: (workflow.variables as Record<string, unknown>) ?? {},
              contextExtensions: { workspaceId: workflow.orgId, userId: workflow.userId },
            })

            let result
            if (runFromBlockId) {
              const [latestLog] = await db
                .select({ executionState: workflowExecutionLogs.executionState })
                .from(workflowExecutionLogs)
                .where(
                  and(
                    eq(workflowExecutionLogs.workflowId, workflowId as `${string}-${string}-${string}-${string}-${string}`),
                    eq(workflowExecutionLogs.status, 'success')
                  )
                )
                .orderBy(desc(workflowExecutionLogs.startedAt))
                .limit(1)

              if (!latestLog?.executionState) {
                return { success: false, error: 'No previous successful execution to run from block' }
              }

              result = await executor.executeFromBlock(
                workflowId,
                runFromBlockId,
                latestLog.executionState as any
              )
            } else {
              result = await executor.execute(workflowId)
            }

            // Save execution log
            const executionId = crypto.randomUUID()
            await db.insert(workflowExecutionLogs).values({
              workflowId: workflowId as `${string}-${string}-${string}-${string}-${string}`,
              orgId: workflow.orgId,
              executionId: executionId as `${string}-${string}-${string}-${string}-${string}`,
              status: result.success ? 'success' : 'error',
              trigger: 'manual',
              startedAt: new Date(),
              endedAt: new Date(),
              totalDurationMs: 0,
              executionData: result.logs ?? [],
              executionState: (result.executionState as unknown as Record<string, unknown>) ?? null,
            })

            return {
              success: result.success,
              output: result.output,
              error: result.error,
              blockResults: result.logs?.map((log: any) => ({
                blockName: log.blockName,
                blockType: log.blockType,
                success: log.success,
                output: log.output,
                durationMs: log.durationMs,
              })),
            }
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Execution failed',
            }
          }
        },
      }),
      get_block_outputs: tool({
        description:
          'Return available output fields for blocks in the current workflow, so you know what <BlockName.field> tags are available.',
        inputSchema: zodSchema(z.object({})),
        execute: async () => {
          const freshState = await loadWorkflowStateForCopilot(workflowId)
          const result: Record<string, { type: string; outputs: string[] }> = {}

          for (const [id, block] of Object.entries(freshState.blocks)) {
            const config = getBlock(block.type)
            if (!config?.outputs) continue

            const outputKeys = Object.keys(config.outputs)
            result[block.name || id] = {
              type: block.type,
              outputs: outputKeys,
            }
          }

          return result
        },
      }),
      get_trigger_blocks: tool({
        description: 'List all block types that can serve as triggers/entry points for workflows.',
        inputSchema: zodSchema(z.object({})),
        execute: async () => {
          const allBlocks = getAllBlocks()
          const triggers: { type: string; name: string; description: string; category: string }[] = []

          for (const block of allBlocks) {
            if (block.hideFromToolbar) continue

            const hasTriggerSubBlocks = block.subBlocks.some((sb) => sb.mode === 'trigger')
            if (block.category === 'triggers' || hasTriggerSubBlocks) {
              triggers.push({
                type: block.type,
                name: block.name,
                description: block.description,
                category: block.category === 'triggers' ? 'core' : 'integration',
              })
            }
          }

          return triggers
        },
      }),
      get_execution_summary: tool({
        description:
          'Return a summary of recent workflow executions — status, duration, trigger type. Use to help users understand execution history.',
        inputSchema: zodSchema(
          z.object({
            limit: z
              .number()
              .optional()
              .describe('Number of recent executions to return (default 5)'),
          })
        ),
        execute: async ({ limit }) => {
          const rows = await db
            .select({
              executionId: workflowExecutionLogs.executionId,
              status: workflowExecutionLogs.status,
              trigger: workflowExecutionLogs.trigger,
              startedAt: workflowExecutionLogs.startedAt,
              endedAt: workflowExecutionLogs.endedAt,
              totalDurationMs: workflowExecutionLogs.totalDurationMs,
            })
            .from(workflowExecutionLogs)
            .where(eq(workflowExecutionLogs.workflowId, workflowId as `${string}-${string}-${string}-${string}-${string}`))
            .orderBy(desc(workflowExecutionLogs.startedAt))
            .limit(limit ?? 5)

          return rows.map((r) => ({
            executionId: r.executionId,
            status: r.status,
            trigger: r.trigger,
            startedAt: r.startedAt?.toISOString(),
            endedAt: r.endedAt?.toISOString(),
            durationMs: r.totalDurationMs,
          }))
        },
      }),
      get_workflow_logs: tool({
        description:
          'Return block-level execution detail for a specific execution. Shows each block that ran, its output, timing, and success status.',
        inputSchema: zodSchema(
          z.object({
            executionId: z.string().describe('The execution ID to get logs for'),
          })
        ),
        execute: async ({ executionId }) => {
          const [row] = await db
            .select({
              status: workflowExecutionLogs.status,
              trigger: workflowExecutionLogs.trigger,
              startedAt: workflowExecutionLogs.startedAt,
              endedAt: workflowExecutionLogs.endedAt,
              totalDurationMs: workflowExecutionLogs.totalDurationMs,
              executionData: workflowExecutionLogs.executionData,
            })
            .from(workflowExecutionLogs)
            .where(
              and(
                eq(workflowExecutionLogs.workflowId, workflowId as `${string}-${string}-${string}-${string}-${string}`),
                eq(workflowExecutionLogs.executionId, executionId as `${string}-${string}-${string}-${string}-${string}`)
              )
            )
            .limit(1)

          if (!row) return { error: 'Execution not found' }

          return {
            status: row.status,
            trigger: row.trigger,
            startedAt: row.startedAt?.toISOString(),
            endedAt: row.endedAt?.toISOString(),
            durationMs: row.totalDurationMs,
            blocks: (row.executionData as any[])?.map((log: any) => ({
              blockId: log.blockId,
              blockName: log.blockName,
              blockType: log.blockType,
              success: log.success,
              durationMs: log.durationMs,
              output: log.output,
              error: log.error,
            })),
          }
        },
      }),
    },
    stopWhen: stepCountIs(8),
  })

  return result.toUIMessageStreamResponse()
}

/**
 * Persist the modified workflow state back to the database.
 * Deletes existing blocks/edges and re-inserts the modified ones.
 */
async function persistWorkflowState(workflowId: string, state: any): Promise<void> {
  const blocks = state.blocks || {}
  const edges = state.edges || []

  const blockInserts = Object.entries(blocks).map(([id, block]: [string, any]) => ({
    id,
    workflowId,
    type: block.type,
    name: block.name || 'Untitled',
    positionX: String(block.position?.x ?? 0),
    positionY: String(block.position?.y ?? 0),
    enabled: block.enabled ?? true,
    advancedMode: block.advancedMode ?? false,
    triggerMode: block.triggerMode ?? false,
    horizontalHandles: block.horizontalHandles ?? true,
    locked: block.locked ?? false,
    height: block.height ?? 0,
    subBlocks: block.subBlocks ?? {},
    outputs: block.outputs ?? {},
    data: block.data ?? {},
  }))

  const blockIds = new Set(Object.keys(blocks))
  const validEdges = edges.filter((e: any) => blockIds.has(e.source) && blockIds.has(e.target))
  const edgeInserts = validEdges.map((e: any) => ({
    id: e.id,
    workflowId,
    sourceBlockId: e.source,
    targetBlockId: e.target,
    sourceHandle: e.sourceHandle ?? 'source',
    targetHandle: e.targetHandle ?? 'target',
  }))

  await db.transaction(async (tx) => {
    // Delete existing blocks (cascade handles edges via FK)
    await tx.delete(workflowBlocks).where(eq(workflowBlocks.workflowId, workflowId))

    if (blockInserts.length > 0) {
      await tx.insert(workflowBlocks).values(blockInserts)
    }

    if (edgeInserts.length > 0) {
      await tx.insert(workflowEdges).values(edgeInserts)
    }

    await tx
      .update(workflows)
      .set({ updatedAt: new Date() })
      .where(eq(workflows.id, workflowId))
  })
}
