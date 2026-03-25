import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { relationships } from "@/lib/db/schema"
import { requireOrg } from "@/lib/auth-helpers"

type Params = Promise<{ id: string }>

export async function DELETE(req: Request, { params }: { params: Params }) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { orgId } = ctx
  const { id } = await params

  const [deleted] = await db
    .delete(relationships)
    .where(
      and(
        eq(relationships.id, id as `${string}-${string}-${string}-${string}-${string}`),
        eq(relationships.orgId, orgId)
      )
    )
    .returning()

  if (!deleted) return Response.json({ error: "Not found" }, { status: 404 })

  return new Response(null, { status: 204 })
}
