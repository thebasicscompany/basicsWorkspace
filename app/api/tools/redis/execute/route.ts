import Redis from 'ioredis'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateDatabaseHost } from '@/lib/core/security/input-validation.server'

const logger = { info: (...args: any[]) => console.log('[RedisAPI]', ...args), warn: (...args: any[]) => console.warn('[RedisAPI]', ...args), error: (...args: any[]) => console.error('[RedisAPI]', ...args) }

const RequestSchema = z.object({
  url: z.string().min(1, 'Redis connection URL is required'),
  command: z.string().min(1, 'Redis command is required'),
  args: z.array(z.union([z.string(), z.number()])).default([]),
})

export async function POST(request: NextRequest) {
  let client: Redis | null = null

  try {
    const body = await request.json()
    const { url, command, args } = RequestSchema.parse(body)

    const parsedUrl = new URL(url)
    const hostname =
      parsedUrl.hostname.startsWith('[') && parsedUrl.hostname.endsWith(']')
        ? parsedUrl.hostname.slice(1, -1)
        : parsedUrl.hostname
    const hostValidation = await validateDatabaseHost(hostname, 'host')
    if (!hostValidation.isValid) {
      return NextResponse.json({ error: hostValidation.error }, { status: 400 })
    }

    client = new Redis(url, {
      connectTimeout: 10000,
      commandTimeout: 10000,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    })

    await client.connect()

    const cmd = command.toUpperCase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (client as any).call(cmd, ...args)

    await client.quit()
    client = null

    return NextResponse.json({ result })
  } catch (error) {
    logger.error('Redis command failed', { error })
    const errorMessage = error instanceof Error ? error.message : 'Redis command failed'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  } finally {
    if (client) {
      try {
        await client.quit()
      } catch {
        client.disconnect()
      }
    }
  }
}
