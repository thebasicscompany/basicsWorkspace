import { requireOrg } from "@/lib/auth-helpers"

/**
 * DELETE /api/connections/:provider — disconnect a provider (proxied to gateway)
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx
  const { provider } = await params

  const gatewayUrl = process.env.GATEWAY_URL
  const gatewayKey = process.env.GATEWAY_API_KEY
  if (!gatewayUrl || !gatewayKey) {
    return Response.json({ error: "Gateway not configured" }, { status: 503 })
  }

  const res = await fetch(`${gatewayUrl}/v1/connections/${provider}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${gatewayKey}`,
      "X-User-Id": ctx.userId,
    },
  })

  if (res.status === 204) return new Response(null, { status: 204 })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
