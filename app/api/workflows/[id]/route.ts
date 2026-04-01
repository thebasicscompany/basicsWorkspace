import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { workflows, workflowBlocks, workflowEdges } from "@/lib/db/schema"
import { requireOrg } from "@/lib/auth-helpers"
import { logContextEvent } from "@/lib/context"

type Params = Promise<{ id: string }>

export async function GET(req: Request, { params }: { params: Params }) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId } = ctx
  const { id } = await params

  const [workflow] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, id as `${string}-${string}-${string}-${string}-${string}`), eq(workflows.orgId, orgId)))
    .limit(1)

  if (!workflow) return Response.json({ error: "Not found" }, { status: 404 })

  const blocks = await db
    .select()
    .from(workflowBlocks)
    .where(eq(workflowBlocks.workflowId, id as `${string}-${string}-${string}-${string}-${string}`))

  const edges = await db
    .select()
    .from(workflowEdges)
    .where(eq(workflowEdges.workflowId, id as `${string}-${string}-${string}-${string}-${string}`))

  return Response.json({ workflow, blocks, edges })
}

export async function PATCH(req: Request, { params }: { params: Params }) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId, userId } = ctx
  const { id } = await params
  const body = await req.json() as {
    name?: string
    description?: string
    blocks?: Array<Record<string, unknown>>
    edges?: Array<{ sourceBlockId: string; targetBlockId: string; sourceHandle?: string | null; targetHandle?: string | null }>
  }

  const [existing] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, id as `${string}-${string}-${string}-${string}-${string}`), eq(workflows.orgId, orgId)))
    .limit(1)

  if (!existing) return Response.json({ error: "Not found" }, { status: 404 })

  const { name, description, blocks, edges } = body

  const metaUpdates: Partial<typeof workflows.$inferInsert> = { updatedAt: new Date() }
  if (name !== undefined) metaUpdates.name = name
  if (description !== undefined) metaUpdates.description = description

  const [updated] = await db
    .update(workflows)
    .set(metaUpdates)
    .where(eq(workflows.id, id as `${string}-${string}-${string}-${string}-${string}`))
    .returning()

  if (blocks !== undefined) {
    // Wrap delete + re-insert in a transaction to prevent partial saves (Sim pattern)
    const blockIds = new Set(blocks.map((b) => b.id as string).filter(Boolean))

    await db.transaction(async (tx) => {
      // Delete existing blocks + edges (cascade via FK)
      await tx
        .delete(workflowBlocks)
        .where(eq(workflowBlocks.workflowId, id as `${string}-${string}-${string}-${string}-${string}`))

      if (blocks.length > 0) {
        await tx.insert(workflowBlocks).values(
          blocks.map((b) => ({
            id: (b.id as string) ?? undefined,
            workflowId: id as `${string}-${string}-${string}-${string}-${string}`,
            type: b.type as string,
            name: (b.name as string | undefined) ?? "Block",
            positionX: b.positionX as string | undefined,
            positionY: b.positionY as string | undefined,
            enabled: b.enabled as boolean | undefined,
            advancedMode: b.advancedMode as boolean | undefined,
            triggerMode: b.triggerMode as boolean | undefined,
            horizontalHandles: b.horizontalHandles as boolean | undefined,
            locked: b.locked as boolean | undefined,
            height: b.height as number | undefined,
            subBlocks: b.subBlocks as Record<string, unknown> | undefined,
            outputs: b.outputs as Record<string, unknown> | undefined,
            data: b.data as Record<string, unknown> | undefined,
          }))
        )

        // Only insert edges that reference valid blocks in this save
        if (edges && edges.length > 0) {
          const validEdges = edges.filter(
            (e) => blockIds.has(e.sourceBlockId) && blockIds.has(e.targetBlockId)
          )
          if (validEdges.length > 0) {
            await tx.insert(workflowEdges).values(
              validEdges.map((e) => ({
                workflowId: id as `${string}-${string}-${string}-${string}-${string}`,
                sourceBlockId: e.sourceBlockId as `${string}-${string}-${string}-${string}-${string}`,
                targetBlockId: e.targetBlockId as `${string}-${string}-${string}-${string}-${string}`,
                sourceHandle: e.sourceHandle ?? null,
                targetHandle: e.targetHandle ?? null,
              }))
            )
          }
        }
      }
    })
  }

  await logContextEvent({
    orgId,
    userId,
    sourceApp: "automations",
    eventType: "workflow.updated",
    entityType: "workflow",
    entityId: id,
    entityName: updated.name,
    metadata: { updatedFields: Object.keys(body) },
  })

  return Response.json(updated)
}

export async function DELETE(req: Request, { params }: { params: Params }) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId, userId } = ctx
  const { id } = await params

  const [workflow] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, id as `${string}-${string}-${string}-${string}-${string}`), eq(workflows.orgId, orgId)))
    .limit(1)

  if (!workflow) return Response.json({ error: "Not found" }, { status: 404 })

  await db
    .delete(workflows)
    .where(eq(workflows.id, id as `${string}-${string}-${string}-${string}-${string}`))

  await logContextEvent({
    orgId,
    userId,
    sourceApp: "automations",
    eventType: "workflow.deleted",
    entityType: "workflow",
    entityId: id,
    entityName: workflow.name,
  })

  return new Response(null, { status: 204 })
}
