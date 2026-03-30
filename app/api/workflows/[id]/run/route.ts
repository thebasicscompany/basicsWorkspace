import { eq, and } from "drizzle-orm"
import { db } from "@/lib/db"
import { workflows, workflowBlocks, workflowEdges, workflowExecutionLogs } from "@/lib/db/schema"
import { requireOrg } from "@/lib/auth-helpers"
import { getEffectiveEnvVars } from "@/lib/environment/utils.server"
import { apiBlockToBlockState } from "@/apps/automations/stores/workflows/utils"
import type { BlockState as SerializerBlockState } from "@/apps/automations/stores/workflow-types"
import { Serializer } from "@/lib/sim/serializer"
import { Executor } from "@/lib/sim/executor"
import type { Edge } from "reactflow"

interface RunRequestBody {
  runFromBlockId?: string
  runUntilBlockId?: string
}

type Params = Promise<{ id: string }>

export async function POST(req: Request, { params }: { params: Params }) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId } = ctx
  const { id } = await params

  // Parse optional body for run-from/until params
  let body: RunRequestBody = {}
  try {
    body = await req.json()
  } catch {
    // No body or invalid JSON — that's fine, run normally
  }
  const { runFromBlockId, runUntilBlockId } = body

  const [workflow] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, id as `${string}-${string}-${string}-${string}-${string}`), eq(workflows.orgId, orgId)))
    .limit(1)

  if (!workflow) return Response.json({ error: "Not found" }, { status: 404 })

  // Load blocks + edges
  const apiBlocks = await db
    .select()
    .from(workflowBlocks)
    .where(eq(workflowBlocks.workflowId, id as `${string}-${string}-${string}-${string}-${string}`))

  const apiEdges = await db
    .select()
    .from(workflowEdges)
    .where(eq(workflowEdges.workflowId, id as `${string}-${string}-${string}-${string}-${string}`))

  // Convert to executor-compatible shapes
  const blockStates: Record<string, SerializerBlockState> = {}
  for (const ab of apiBlocks) {
    const bs = apiBlockToBlockState(ab) as unknown as SerializerBlockState
    blockStates[bs.id] = bs
  }

  const edges: Edge[] = apiEdges.map((e) => ({
    id: e.id,
    source: e.sourceBlockId,
    target: e.targetBlockId,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
  }))

  // Serialize and execute
  const serializer = new Serializer()
  const serialized = serializer.serializeWorkflow(blockStates, edges)

  const executionId = crypto.randomUUID()
  const startTime = Date.now()

  // Stream execution events via SSE
  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      const send = (data: unknown) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`))

      send({ type: "start", executionId, workflowId: id, runFromBlockId, runUntilBlockId })

      try {
        const envVarValues = await getEffectiveEnvVars(ctx.userId)
        const executor = new Executor({
          workflow: serialized,
          envVarValues,
          workflowVariables: (workflow.variables as Record<string, unknown>) ?? {},
          contextExtensions: {
            workspaceId: orgId,
            ...(runUntilBlockId && { stopAfterBlockId: runUntilBlockId }),
          },
        })

        // TODO: runFromBlockId requires a sourceSnapshot (previous execution state)
        // to properly use executor.executeFromBlock(). For now, we execute normally
        // and pass runFromBlockId as the trigger block so execution starts from there.
        const result = await executor.execute(id, runFromBlockId || undefined)

        // Send block-level results from logs
        if (result.logs) {
          for (const log of result.logs) {
            send({
              type: "block:complete",
              blockId: log.blockId,
              blockName: log.blockName,
              blockType: log.blockType,
              output: log.output,
              durationMs: log.durationMs,
            })
          }
        }

        send({
          type: "complete",
          executionId,
          success: result.success,
          output: result.output,
          error: result.error,
        })

        // Write execution log to DB
        const endTime = Date.now()
        await db.insert(workflowExecutionLogs).values({
          workflowId: id as `${string}-${string}-${string}-${string}-${string}`,
          orgId,
          executionId: executionId as `${string}-${string}-${string}-${string}-${string}`,
          status: result.success ? "success" : "error",
          trigger: "manual",
          startedAt: new Date(startTime),
          endedAt: new Date(endTime),
          totalDurationMs: endTime - startTime,
          executionData: result.logs ?? [],
        })

        // Update workflow run count + last run
        await db
          .update(workflows)
          .set({
            runCount: (workflow.runCount ?? 0) + 1,
            lastRunAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(workflows.id, id as `${string}-${string}-${string}-${string}-${string}`))
      } catch (err: any) {
        send({
          type: "error",
          executionId,
          error: err.message ?? "Execution failed",
        })

        // Log the failed execution
        await db.insert(workflowExecutionLogs).values({
          workflowId: id as `${string}-${string}-${string}-${string}-${string}`,
          orgId,
          executionId: executionId as `${string}-${string}-${string}-${string}-${string}`,
          status: "error",
          trigger: "manual",
          startedAt: new Date(startTime),
          endedAt: new Date(),
          totalDurationMs: Date.now() - startTime,
          executionData: [],
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
