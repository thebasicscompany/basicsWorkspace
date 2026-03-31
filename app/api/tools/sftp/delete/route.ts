// @ts-nocheck
import { type NextRequest, NextResponse } from 'next/server'
import type { SFTPWrapper } from 'ssh2'
import { z } from 'zod'
import { generateRequestId } from '@/lib/core/utils/request'
import {
  createSftpConnection,
  getFileType,
  getSftp,
  isPathSafe,
  sanitizePath,
  sftpIsDirectory,
} from '@/app/api/tools/sftp/utils'

export const dynamic = 'force-dynamic'

const logger = { info: (...args: any[]) => console.log('[sftp-delete]', ...args), warn: (...args: any[]) => console.warn('[sftp-delete]', ...args), error: (...args: any[]) => console.error('[sftp-delete]', ...args) }

const DeleteSchema = z.object({
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
 * Recursively deletes a directory and all its contents
 */
async function deleteRecursive(sftp: SFTPWrapper, dirPath: string): Promise<void> {
  const entries = await new Promise<Array<{ filename: string; attrs: any }>>((resolve, reject) => {
    sftp.readdir(dirPath, (err, list) => {
      if (err) {
        reject(err)
      } else {
        resolve(list)
      }
    })
  })

  for (const entry of entries) {
    if (entry.filename === '.' || entry.filename === '..') continue

    const entryPath = `${dirPath}/${entry.filename}`
    const entryType = getFileType(entry.attrs)

    if (entryType === 'directory') {
      await deleteRecursive(sftp, entryPath)
    } else {
      await new Promise<void>((resolve, reject) => {
        sftp.unlink(entryPath, (err) => {
          if (err) reject(err)
          else resolve()
        })
      })
    }
  }

  await new Promise<void>((resolve, reject) => {
    sftp.rmdir(dirPath, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const body = await request.json()
    const params = DeleteSchema.parse(body)

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

      logger.info(`[${requestId}] Deleting ${remotePath} (recursive: ${params.recursive})`)

      const isDir = await sftpIsDirectory(sftp, remotePath)

      if (isDir) {
        if (params.recursive) {
          await deleteRecursive(sftp, remotePath)
        } else {
          await new Promise<void>((resolve, reject) => {
            sftp.rmdir(remotePath, (err) => {
              if (err) {
                if (err.message.includes('not empty')) {
                  reject(
                    new Error(
                      'Directory is not empty. Use recursive: true to delete non-empty directories.'
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
      } else {
        await new Promise<void>((resolve, reject) => {
          sftp.unlink(remotePath, (err) => {
            if (err) {
              if (err.message.includes('No such file')) {
                reject(new Error(`File not found: ${remotePath}`))
              } else {
                reject(err)
              }
            } else {
              resolve()
            }
          })
        })
      }

      logger.info(`[${requestId}] Successfully deleted ${remotePath}`)

      return NextResponse.json({
        success: true,
        deletedPath: remotePath,
        message: `Successfully deleted ${remotePath}`,
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
    logger.error(`[${requestId}] SFTP delete failed:`, error)

    return NextResponse.json({ error: `SFTP delete failed: ${errorMessage}` }, { status: 500 })
  }
}
