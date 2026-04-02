import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { db } from "@/lib/db"
import { recordings } from "@/lib/db/schema/recordings"
import { eq, and } from "drizzle-orm"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const orgId = session.session.activeOrganizationId || session.user.id

  const [row] = await db
    .select()
    .from(recordings)
    .where(and(eq(recordings.id, id), eq(recordings.orgId, orgId)))

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ recording: row })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const orgId = session.session.activeOrganizationId || session.user.id

  const body = await request.json()
  const updates: Record<string, unknown> = {}

  if (body.status) updates.status = body.status
  if (body.events !== undefined) updates.events = body.events
  if (body.structuredActions !== undefined) updates.structuredActions = body.structuredActions
  if (body.duration !== undefined) updates.duration = body.duration
  if (body.eventCount !== undefined) updates.eventCount = body.eventCount
  if (body.name) updates.name = body.name

  const [row] = await db
    .update(recordings)
    .set(updates)
    .where(and(eq(recordings.id, id), eq(recordings.orgId, orgId)))
    .returning()

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ recording: row })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const orgId = session.session.activeOrganizationId || session.user.id

  const [row] = await db
    .delete(recordings)
    .where(and(eq(recordings.id, id), eq(recordings.orgId, orgId)))
    .returning()

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ deleted: true })
}
