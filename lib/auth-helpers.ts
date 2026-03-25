import { eq } from "drizzle-orm"
import { auth } from "./auth"
import { db } from "./db"
import { member } from "./db/schema"

export type OrgContext = {
  orgId: string
  userId: string
  session: Awaited<ReturnType<typeof auth.api.getSession>>
}

/**
 * Returns the authenticated org context, or a Response to return early.
 * Usage in route handlers:
 *   const ctx = await requireOrg(req)
 *   if (ctx instanceof Response) return ctx
 */
export async function requireOrg(request: Request): Promise<OrgContext | Response> {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return new Response("Unauthorized", { status: 401 })

  let orgId = session.session.activeOrganizationId

  // Fall back to user's first org — handles sessions created before the org plugin
  // and new users who haven't explicitly set an active org yet
  if (!orgId) {
    const [m] = await db
      .select({ organizationId: member.organizationId })
      .from(member)
      .where(eq(member.userId, session.user.id))
      .limit(1)
    orgId = m?.organizationId ?? null
  }

  if (!orgId) return new Response("No active org", { status: 403 })
  return { session, orgId, userId: session.user.id }
}
