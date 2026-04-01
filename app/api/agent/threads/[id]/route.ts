import { eq, and, asc } from "drizzle-orm"
import { db } from "@/lib/db"
import { chatThreads, chatMessages } from "@/lib/db/schema"
import { requireOrg } from "@/lib/auth-helpers"

type Params = Promise<{ id: string }>

/** GET /api/agent/threads/[id] — load a thread with messages */
export async function GET(req: Request, { params }: { params: Params }) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { id } = await params

  const [thread] = await db
    .select()
    .from(chatThreads)
    .where(and(eq(chatThreads.id, id as any), eq(chatThreads.userId, ctx.userId)))
    .limit(1)

  if (!thread) {
    return Response.json({ error: "Thread not found" }, { status: 404 })
  }

  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.threadId, id as any))
    .orderBy(asc(chatMessages.createdAt))

  return Response.json({ thread, messages })
}

/** PATCH /api/agent/threads/[id] — update title */
export async function PATCH(req: Request, { params }: { params: Params }) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { id } = await params

  const body = await req.json()

  const [thread] = await db
    .select({ id: chatThreads.id })
    .from(chatThreads)
    .where(and(eq(chatThreads.id, id as any), eq(chatThreads.userId, ctx.userId)))
    .limit(1)

  if (!thread) {
    return Response.json({ error: "Thread not found" }, { status: 404 })
  }

  await db
    .update(chatThreads)
    .set({
      ...(body.title !== undefined && { title: body.title }),
      updatedAt: new Date(),
    })
    .where(eq(chatThreads.id, id as any))

  return Response.json({ ok: true })
}

/** DELETE /api/agent/threads/[id] — archive thread */
export async function DELETE(req: Request, { params }: { params: Params }) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { id } = await params

  const [thread] = await db
    .select({ id: chatThreads.id })
    .from(chatThreads)
    .where(and(eq(chatThreads.id, id as any), eq(chatThreads.userId, ctx.userId)))
    .limit(1)

  if (!thread) {
    return Response.json({ error: "Thread not found" }, { status: 404 })
  }

  await db
    .update(chatThreads)
    .set({ archivedAt: new Date() })
    .where(eq(chatThreads.id, id as any))

  return Response.json({ ok: true })
}
