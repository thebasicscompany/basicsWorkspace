import { requireOrg } from "@/lib/auth-helpers"
import { verifyInternalToken } from "@/lib/auth/internal"

/**
 * POST /api/auth/oauth/token
 *
 * Called by executeTool() when a block needs an OAuth access token.
 * Proxies to the gateway's /v1/connections/:provider/token endpoint
 * which decrypts and returns the stored OAuth token.
 *
 * Accepts two auth methods:
 * 1. Session cookie (browser/UI calls)
 * 2. Internal JWT Bearer token (server-side executor calls)
 *
 * Request body: { credentialId: string }
 * Response: { accessToken: string, instanceUrl?: string }
 */
export async function POST(req: Request) {
  // Try session auth first, then internal JWT
  let userId: string | undefined

  const ctx = await requireOrg(req)
  if (ctx instanceof Response) {
    // Session auth failed — try internal JWT
    const authHeader = req.headers.get("authorization")
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1]
      const verification = await verifyInternalToken(token)
      if (verification.valid && verification.userId) {
        userId = verification.userId
      }
    }

    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
  } else {
    userId = ctx.userId
  }

  const gatewayUrl = process.env.GATEWAY_URL
  const gatewayKey = process.env.GATEWAY_API_KEY
  if (!gatewayUrl || !gatewayKey) {
    return Response.json({ error: "Gateway not configured" }, { status: 503 })
  }

  let body: { credentialId?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const provider = body.credentialId
  if (!provider) {
    return Response.json({ error: "credentialId is required" }, { status: 400 })
  }

  try {
    const res = await fetch(`${gatewayUrl}/v1/connections/${encodeURIComponent(provider)}/token`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${gatewayKey}`,
        "Content-Type": "application/json",
        "X-User-Id": userId,
      },
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Token fetch failed" }))
      return Response.json(
        { error: (err as Record<string, string>).error || `Failed to get ${provider} token` },
        { status: res.status }
      )
    }

    const data = await res.json()
    return Response.json(data)
  } catch (error: any) {
    console.error("[OAuthToken] Gateway request failed:", error.message)
    return Response.json({ error: "Failed to reach gateway" }, { status: 502 })
  }
}
