import { eq, and, isNull, desc } from "drizzle-orm"
import { db } from "@/lib/db"
import { chatThreads, chatMessages } from "@/lib/db/schema"
import { requireOrg } from "@/lib/auth-helpers"

/** GET /api/agent/threads — list threads for user */
export async function GET(req: Request) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx

  const threads = await db
    .select({
      id: chatThreads.id,
      title: chatThreads.title,
      createdAt: chatThreads.createdAt,
      updatedAt: chatThreads.updatedAt,
    })
    .from(chatThreads)
    .where(
      and(
        eq(chatThreads.userId, ctx.userId),
        isNull(chatThreads.archivedAt)
      )
    )
    .orderBy(desc(chatThreads.updatedAt))

  return Response.json({ threads })
}

/** POST /api/agent/threads — create a new thread */
export async function POST(req: Request) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx

  let title = "New conversation"
  try {
    const body = await req.json()
    if (body.title) title = body.title
  } catch {
    // No body — that's fine
  }

  const [thread] = await db
    .insert(chatThreads)
    .values({
      userId: ctx.userId,
      title,
    })
    .returning()

  return Response.json({ thread }, { status: 201 })
}
