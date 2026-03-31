// @ts-nocheck
import { type NextRequest, NextResponse } from 'next/server'
import type { SFTPWrapper } from 'ssh2'
import { z } from 'zod'
import { generateRequestId } from '@/lib/core/utils/request'
import {
  createSftpConnection,
  getSftp,
  isPathSafe,
  sanitizePath,
  sftpExists,
} from '@/app/api/tools/sftp/utils'

export const dynamic = 'force-dynamic'

const logger = { info: (...args: any[]) => console.log('[sftp-mkdir]', ...args), warn: (...args: any[]) => console.warn('[sftp-mkdir]', ...args), error: (...args: any[]) => console.error('[sftp-mkdir]', ...args) }

const MkdirSchema = z.object({
  host: z.string().min(1, 'Host is required'),
  port: z.coerce.number().int().positive().default(22),
  username: z.string().min(1, 'Username is required'),
  password: z.string().nullish(),
  privateKey: z.string().nullish(),
  passphrase: z.string().nullish(),
  remotePath: z.string().min(1, 'Remote path is required'),
  recursive: z.boolean().default(false),
})

/**
 * Creates directory recursively (like mkdir -p)
 */
async function mkdirRecursive(sftp: SFTPWrapper, dirPath: string): Promise<void> {
  const parts = dirPath.split('/').filter(Boolean)
  let currentPath = dirPath.startsWith('/') ? '' : ''

  for (const part of parts) {
    currentPath = currentPath
      ? `${currentPath}/${part}`
      : dirPath.startsWith('/')
        ? `/${part}`
        : part

    const exists = await sftpExists(sftp, currentPath)
    if (!exists) {
      await new Promise<void>((resolve, reject) => {
        sftp.mkdir(currentPath, (err) => {
          if (err && !err.message.includes('already exists')) {
            reject(err)
          } else {
            resolve()
          }
        })
      })
    }
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const body = await request.json()
    const params = MkdirSchema.parse(body)

    if (!params.password && !params.privateKey) {
      return NextResponse.json(
        { error: 'Either password or privateKey must be provided' },
        { status: 400 }
      )
    }

    if (!isPathSafe(params.remotePath)) {
      logger.warn(`[${requestId}] Path traversal attempt detected in remotePath`)
      return NextResponse.json(
        { error: 'Invalid remote path: path traversal sequences are not allowed' },
        { status: 400 }
      )
    }

    logger.info(`[${requestId}] Connecting to SFTP server ${params.host}:${params.port}`)

    const client = await createSftpConnection({
      host: params.host,
      port: params.port,
      username: params.username,
      password: params.password,
      privateKey: params.privateKey,
      passphrase: params.passphrase,
    })

    try {
      const sftp = await getSftp(client)
      const remotePath = sanitizePath(params.remotePath)

      logger.info(
        `[${requestId}] Creating directory ${remotePath} (recursive: ${params.recursive})`
      )

      if (params.recursive) {
        await mkdirRecursive(sftp, remotePath)
      } else {
        const exists = await sftpExists(sftp, remotePath)
        if (exists) {
          return NextResponse.json(
            { error: `Directory already exists: ${remotePath}` },
            { status: 409 }
          )
        }

        await new Promise<void>((resolve, reject) => {
          sftp.mkdir(remotePath, (err) => {
            if (err) {
              if (err.message.includes('No such file')) {
                reject(
                  new Error(
                    'Parent directory does not exist. Use recursive: true to create parent directories.'
                  )
                )
              } else {
                reject(err)
              }
            } else {
              resolve()
            }
          })
        })
      }

      logger.info(`[${requestId}] Successfully created directory ${remotePath}`)

      return NextResponse.json({
        success: true,
        createdPath: remotePath,
        message: `Successfully created directory ${remotePath}`,
      })
    } finally {
      client.end()
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid request data`, { errors: error.issues })
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    logger.error(`[${requestId}] SFTP mkdir failed:`, error)

    return NextResponse.json({ error: `SFTP mkdir failed: ${errorMessage}` }, { status: 500 })
  }
}
