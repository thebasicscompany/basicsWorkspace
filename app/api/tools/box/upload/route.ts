import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateRequestId } from '@/lib/core/utils/request'
import { FileInputSchema } from '@/lib/uploads/utils/file-schemas'
import { processFilesToUserFiles, type RawFileInput } from '@/lib/uploads/utils/file-utils'
import { downloadFileFromStorage } from '@/lib/uploads/utils/file-utils.server'

export const dynamic = 'force-dynamic'

const logger = { info: (...args: any[]) => console.log('[box-upload]', ...args), warn: (...args: any[]) => console.warn('[box-upload]', ...args), error: (...args: any[]) => console.error('[box-upload]', ...args) }

const BoxUploadSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
  parentFolderId: z.string().min(1, 'Parent folder ID is required'),
  file: FileInputSchema.optional().nullable(),
  fileContent: z.string().optional().nullable(),
  fileName: z.string().optional().nullable(),
})

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const body = await request.json()
    const validatedData = BoxUploadSchema.parse(body)

    let fileBuffer: Buffer
    let fileName: string

    if (validatedData.file) {
      const userFiles = processFilesToUserFiles(
        [validatedData.file as unknown as RawFileInput],
        requestId,
        logger
      ) as Array<{ name: string; type?: string; size: number }>

      if (userFiles.length === 0) {
        return NextResponse.json({ success: false, error: 'Invalid file input' }, { status: 400 })
      }

      const userFile = userFiles[0] as { name: string; size: number; type?: string }
      logger.info(`[${requestId}] Downloading file: ${userFile.name} (${userFile.size} bytes)`)

      fileBuffer = await downloadFileFromStorage(userFile, requestId, logger)
      fileName = validatedData.fileName || userFile.name
    } else if (validatedData.fileContent) {
      logger.info(`[${requestId}] Using legacy base64 content input`)
      fileBuffer = Buffer.from(validatedData.fileContent, 'base64')
      fileName = validatedData.fileName || 'file'
    } else {
      return NextResponse.json({ success: false, error: 'File is required' }, { status: 400 })
    }

    logger.info(
      `[${requestId}] Uploading to Box folder ${validatedData.parentFolderId}: ${fileName} (${fileBuffer.length} bytes)`
    )

    const attributes = JSON.stringify({
      name: fileName,
      parent: { id: validatedData.parentFolderId },
    })

    const formData = new FormData()
    formData.append('attributes', attributes)
    formData.append(
      'file',
      new Blob([new Uint8Array(fileBuffer)], { type: 'application/octet-stream' }),
      fileName
    )

    const response = await fetch('https://upload.box.com/api/2.0/files/content', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${validatedData.accessToken}`,
      },
      body: formData,
    })

    const data = await response.json()

    if (!response.ok) {
      const errorMessage = data.message || 'Failed to upload file'
      logger.error(`[${requestId}] Box API error:`, { status: response.status, data })
      return NextResponse.json({ success: false, error: errorMessage }, { status: response.status })
    }

    const file = data.entries?.[0]

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file returned in upload response' },
        { status: 500 }
      )
    }

    logger.info(`[${requestId}] File uploaded successfully: ${file.name} (ID: ${file.id})`)

    return NextResponse.json({
      success: true,
      output: {
        id: file.id ?? '',
        name: file.name ?? '',
        size: file.size ?? 0,
        sha1: file.sha1 ?? null,
        createdAt: file.created_at ?? null,
        modifiedAt: file.modified_at ?? null,
        parentId: file.parent?.id ?? null,
        parentName: file.parent?.name ?? null,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Validation error:`, error.issues)
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message || 'Validation failed' },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Unexpected error:`, error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
