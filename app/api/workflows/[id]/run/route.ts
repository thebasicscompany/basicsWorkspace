import { eq, and } from "drizzle-orm"
import { db } from "@/lib/db"
import { workflows } from "@/lib/db/schema"
import { requireOrg } from "@/lib/auth-helpers"

type Params = Promise<{ id: string }>

export async function POST(req: Request, { params }: { params: Params }) {
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

  // SSE stub — Phase 3D will wire the real Sim executor here
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder()
      const send = (data: unknown) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`))

      send({ type: "start", workflowId: id })
      send({ type: "complete", workflowId: id })
      controller.close()
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
