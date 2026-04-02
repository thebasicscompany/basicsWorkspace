/**
 * GET /api/cron/schedules
 *
 * Serverless-compatible cron endpoint for executing due schedules.
 * Called by Vercel Cron, external scheduler, or any HTTP cron service.
 *
 * Auth: Requires CRON_SECRET in Authorization header (or query param).
 * Set CRON_SECRET env var to enable. If not set, falls back to allowing
 * localhost requests only.
 */
import { type NextRequest, NextResponse } from 'next/server'
import { checkAndExecuteDueSchedules } from '@/lib/schedules/worker'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max for Vercel

function verifyCronAuth(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    // No secret configured — only allow from localhost in dev
    const host = request.headers.get('host') || ''
    return host.startsWith('localhost') || host.startsWith('127.0.0.1')
  }

  // Check Authorization header only — never accept secrets in query params
  // (query params leak in logs, referer headers, and browser history)
  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${cronSecret}`) return true

  return false
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await checkAndExecuteDueSchedules()

    return NextResponse.json({
      ok: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[Cron/Schedules] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Schedule check failed' },
      { status: 500 }
    )
  }
}
