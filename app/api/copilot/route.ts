import { createOpenAI } from '@ai-sdk/openai'
import { streamText, convertToModelMessages, tool, zodSchema, stepCountIs } from 'ai'
import type { UIMessage } from 'ai'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { workflows, workflowBlocks, workflowEdges } from '@/lib/db/schema/workflows'
import { applyOperationsToWorkflowState } from '@/lib/copilot/edit-workflow'
import type { EditWorkflowOperation } from '@/lib/copilot/edit-workflow'
import {
  loadWorkflowStateForCopilot,
  serializeWorkflowState,
  buildBlockRegistrySummary,
  getBlocksMetadata,
} from '@/lib/copilot/workflow-context'

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

## Referencing block outputs
Use the tag syntax to reference another block's output in an input field:
  {{BlockName.outputField}}
Example: If block "Research Agent" outputs "content", use {{Research Agent.content}} in another block's input.

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

## Common workflow patterns

### Simple agent pipeline
Start Trigger → Agent (with system prompt + model) → Function (process output)

### API integration
Start Trigger → API block (fetch data) → Agent (analyze) → Slack/Gmail (send result)

### Conditional routing
Start Trigger → Agent → Condition (check output) → [If branch] / [Else branch]

## Rules
1. ALWAYS call get_blocks_metadata for ALL block types you plan to use BEFORE calling edit_workflow. Do not guess input field names.
2. When creating multi-block workflows, create ALL blocks in a single edit_workflow call with connections
3. Explain what you're building before calling tools
4. For agent blocks: the input is "messages" (type messages-input, an array of {role, content}), not "systemPrompt". Always look up the block first.
5. Use "basics-chat-smart-openai" as the default model for agent blocks
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
  const body = await req.json()
  const { messages, workflowId }: { messages: UIMessage[]; workflowId: string } = body

  if (!workflowId) {
    return new Response(JSON.stringify({ error: 'workflowId is required' }), {
      status: 400,
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
  // Delete existing blocks and edges (cascade will handle edges via FK)
  await db.delete(workflowBlocks).where(eq(workflowBlocks.workflowId, workflowId))

  const blocks = state.blocks || {}
  const edges = state.edges || []

  // Insert blocks
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

  if (blockInserts.length > 0) {
    await db.insert(workflowBlocks).values(blockInserts)
  }

  // Insert edges (filter to only valid block references)
  const blockIds = new Set(Object.keys(blocks))
  const validEdges = edges.filter((e: any) => blockIds.has(e.source) && blockIds.has(e.target))

  if (validEdges.length > 0) {
    const edgeInserts = validEdges.map((e: any) => ({
      id: e.id,
      workflowId,
      sourceBlockId: e.source,
      targetBlockId: e.target,
      sourceHandle: e.sourceHandle ?? 'source',
      targetHandle: e.targetHandle ?? 'target',
    }))

    await db.insert(workflowEdges).values(edgeInserts)
  }

  // Update workflow timestamp
  await db
    .update(workflows)
    .set({ updatedAt: new Date() })
    .where(eq(workflows.id, workflowId))
}
