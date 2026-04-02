import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { requireOrg } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { logContextEvent } from "@/lib/context"
import { organization, user } from "@/lib/db/schema"

export async function GET(req: NextRequest) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx

  const [org] = await db
    .select({
      gatewayUrl: organization.metadata,
      gatewayApiKey: organization.gatewayApiKey,
      orgName: organization.name,
    })
    .from(organization)
    .where(eq(organization.id, ctx.orgId))
    .limit(1)

  const [profile] = await db
    .select({ name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, ctx.userId))
    .limit(1)

  // gatewayUrl is stored in org metadata JSON
  let gatewayUrl = ""
  try {
    const meta = org?.gatewayUrl ? JSON.parse(org.gatewayUrl) : {}
    gatewayUrl = meta.gatewayUrl ?? ""
  } catch {
    gatewayUrl = ""
  }

  return NextResponse.json({
    profile: { name: profile?.name ?? "", email: profile?.email ?? "" },
    gateway: {
      gatewayUrl,
      gatewayApiKey: org?.gatewayApiKey ?? "",
    },
    org: { name: org?.orgName ?? "" },
  })
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx

  const body = await req.json()

  // Gateway settings
  if (body.gateway !== undefined) {
    const { gatewayUrl, gatewayApiKey } = body.gateway

    // Read existing metadata to merge gatewayUrl into it
    const [org] = await db
      .select({ metadata: organization.metadata })
      .from(organization)
      .where(eq(organization.id, ctx.orgId))
      .limit(1)

    let meta: Record<string, unknown> = {}
    try { meta = org?.metadata ? JSON.parse(org.metadata) : {} } catch { meta = {} }

    if (gatewayUrl !== undefined) meta.gatewayUrl = gatewayUrl

    await db
      .update(organization)
      .set({
        ...(gatewayApiKey !== undefined && { gatewayApiKey }),
        metadata: JSON.stringify(meta),
      })
      .where(eq(organization.id, ctx.orgId))
  }

  // Profile update (name only — email requires verification, stub for now)
  if (body.profile !== undefined) {
    const { name } = body.profile
    if (name !== undefined) {
      await db
        .update(user)
        .set({ name, updatedAt: new Date() })
        .where(eq(user.id, ctx.userId))
    }
  }

  await logContextEvent({
    orgId: ctx.orgId,
    userId: ctx.userId,
    sourceApp: "settings",
    eventType: "settings.updated",
    entityType: "settings",
    entityId: ctx.orgId,
    metadata: { sections: Object.keys(body) },
  })

  return NextResponse.json({ ok: true })
}
