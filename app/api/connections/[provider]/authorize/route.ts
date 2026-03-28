import { requireOrg } from "@/lib/auth-helpers"

/**
 * GET /api/connections/:provider/authorize — get OAuth URL from gateway
 */
export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { provider } = await params

  const gatewayUrl = process.env.GATEWAY_URL
  const gatewayKey = process.env.GATEWAY_API_KEY
  if (!gatewayUrl || !gatewayKey) {
    return Response.json({ error: "Gateway not configured" }, { status: 503 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const redirectAfter = `${appUrl}/shop?connected=${provider}`

  const res = await fetch(
    `${gatewayUrl}/v1/connections/${provider}/authorize?redirect_after=${encodeURIComponent(redirectAfter)}`,
    {
      headers: {
        Authorization: `Bearer ${gatewayKey}`,
        "X-User-Id": ctx.userId,
      },
    }
  )

  const data = await res.json()
  return Response.json(data, { status: res.status })
}
