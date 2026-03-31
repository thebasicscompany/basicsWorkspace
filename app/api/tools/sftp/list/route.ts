// @ts-nocheck
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateRequestId } from '@/lib/core/utils/request'
import {
  createSftpConnection,
  getFileType,
  getSftp,
  isPathSafe,
  parsePermissions,
  sanitizePath,
} from '@/app/api/tools/sftp/utils'

export const dynamic = 'force-dynamic'

const logger = { info: (...args: any[]) => console.log('[sftp-list]', ...args), warn: (...args: any[]) => console.warn('[sftp-list]', ...args), error: (...args: any[]) => console.error('[sftp-list]', ...args) }

const ListSchema = z.object({
  host: z.string().min(1, 'Host is required'),
  port: z.coerce.number().int().positive().default(22),
  username: z.string().min(1, 'Username is required'),
  password: z.string().nullish(),
  privateKey: z.string().nullish(),
  passphrase: z.string().nullish(),
  remotePath: z.string().min(1, 'Remote path is required'),
  detailed: z.boolean().default(false),
})

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const body = await request.json()
    const params = ListSchema.parse(body)

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

      logger.info(`[${requestId}] Listing directory ${remotePath}`)

      const fileList = await new Promise<Array<{ filename: string; longname: string; attrs: any }>>(
        (resolve, reject) => {
          sftp.readdir(remotePath, (err, list) => {
            if (err) {
              if (err.message.includes('No such file')) {
                reject(new Error(`Directory not found: ${remotePath}`))
              } else {
                reject(err)
              }
            } else {
              resolve(list)
            }
          })
        }
      )

      const entries = fileList
        .filter((item) => item.filename !== '.' && item.filename !== '..')
        .map((item) => {
          const entry: {
            name: string
            type: 'file' | 'directory' | 'symlink' | 'other'
            size?: number
            permissions?: string
            modifiedAt?: string
          } = {
            name: item.filename,
            type: getFileType(item.attrs),
          }

          if (params.detailed) {
            entry.size = item.attrs.size
            entry.permissions = parsePermissions(item.attrs.mode)
            if (item.attrs.mtime) {
              entry.modifiedAt = new Date(item.attrs.mtime * 1000).toISOString()
            }
          }

          return entry
        })

      entries.sort((a, b) => {
        if (a.type === 'directory' && b.type !== 'directory') return -1
        if (a.type !== 'directory' && b.type === 'directory') return 1
        return a.name.localeCompare(b.name)
      })

      logger.info(`[${requestId}] Listed ${entries.length} entries in ${remotePath}`)

      return NextResponse.json({
        success: true,
        path: remotePath,
        entries,
        count: entries.length,
        message: `Found ${entries.length} entries in ${remotePath}`,
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
    logger.error(`[${requestId}] SFTP list failed:`, error)

    return NextResponse.json({ error: `SFTP list failed: ${errorMessage}` }, { status: 500 })
  }
}
