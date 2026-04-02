import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { db } from "@/lib/db"
import { recordings } from "@/lib/db/schema/recordings"
import { eq, desc } from "drizzle-orm"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = session.session.activeOrganizationId
  if (!orgId) {
    return NextResponse.json({ recordings: [] })
  }

  const rows = await db
    .select()
    .from(recordings)
    .where(eq(recordings.orgId, orgId))
    .orderBy(desc(recordings.createdAt))

  return NextResponse.json({ recordings: rows })
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = session.session.activeOrganizationId
  if (!orgId) {
    return NextResponse.json({ error: "No active organization" }, { status: 400 })
  }

  const body = await request.json()

  const [row] = await db
    .insert(recordings)
    .values({
      orgId,
      userId: session.user.id,
      name: body.name || "Untitled Recording",
      status: "recording",
    })
    .returning()

  return NextResponse.json({ recording: row }, { status: 201 })
}
