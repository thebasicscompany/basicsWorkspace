import { requireOrg } from "@/lib/auth-helpers"

/**
 * GET /api/connections — list connected providers (proxied to gateway)
 */
export async function GET(req: Request) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx

  const gatewayUrl = process.env.GATEWAY_URL
  const gatewayKey = process.env.GATEWAY_API_KEY
  if (!gatewayUrl || !gatewayKey) {
    return Response.json({ error: "Gateway not configured" }, { status: 503 })
  }

  const res = await fetch(`${gatewayUrl}/v1/connections`, {
    headers: {
      Authorization: `Bearer ${gatewayKey}`,
      "X-User-Id": ctx.userId,
    },
  })

  const data = await res.json()
  return Response.json(data, { status: res.status })
}
