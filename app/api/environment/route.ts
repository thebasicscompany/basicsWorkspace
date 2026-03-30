import { eq } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { environment } from "@/lib/db/schema"
import { encryptRecord, decryptRecord, isEncryptionEnabled } from "@/lib/core/security/encryption"
import type { EnvironmentVariable } from "@/apps/automations/stores/settings/environment/types"

const EnvVarSchema = z.object({
  variables: z.record(z.string(), z.string()),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()

    try {
      const { variables } = EnvVarSchema.parse(body)

      const stored = isEncryptionEnabled()
        ? encryptRecord(variables as Record<string, string>)
        : (variables as Record<string, string>)

      await db
        .insert(environment)
        .values({
          userId: session.user.id,
          variables: stored,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [environment.userId],
          set: {
            variables: stored,
            updatedAt: new Date(),
          },
        })

      return NextResponse.json({ success: true })
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid request data", details: validationError.issues },
          { status: 400 }
        )
      }
      throw validationError
    }
  } catch (error) {
    console.error("[EnvironmentAPI] Error updating environment variables", error)
    return NextResponse.json(
      { error: "Failed to update environment variables" },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    const result = await db
      .select()
      .from(environment)
      .where(eq(environment.userId, userId))
      .limit(1)

    if (!result.length || !result[0].variables) {
      return NextResponse.json({ data: {} }, { status: 200 })
    }

    const raw = result[0].variables as Record<string, string>
    const storedVariables = isEncryptionEnabled() ? decryptRecord(raw) : raw
    const data: Record<string, EnvironmentVariable> = {}

    for (const [key, value] of Object.entries(storedVariables)) {
      data[key] = { key, value }
    }

    return NextResponse.json({ data }, { status: 200 })
  } catch (error: any) {
    console.error("[EnvironmentAPI] Environment fetch error", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
