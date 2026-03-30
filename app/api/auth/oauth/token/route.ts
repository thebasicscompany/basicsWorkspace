import { requireOrg } from "@/lib/auth-helpers"

/**
 * POST /api/auth/oauth/token
 *
 * Called by executeTool() when a block needs an OAuth access token.
 * Proxies to the gateway's /v1/connections/:provider/token endpoint
 * which decrypts and returns the stored OAuth token.
 *
 * Request body: { credentialId: string }
 * credentialId is the provider name (e.g. "slack", "github") as stored by the credential selector.
 *
 * Response: { accessToken: string, instanceUrl?: string }
 */
export async function POST(req: Request) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx

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
        "X-User-Id": ctx.userId,
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
