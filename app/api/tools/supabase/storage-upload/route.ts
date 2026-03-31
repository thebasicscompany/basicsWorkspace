import { randomUUID } from 'crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const logger = { info: (...args: any[]) => console.log('[SupabaseStorageUploadAPI]', ...args), warn: (...args: any[]) => console.warn('[SupabaseStorageUploadAPI]', ...args), error: (...args: any[]) => console.error('[SupabaseStorageUploadAPI]', ...args) }

// TODO: Wire FileInputSchema from @/lib/uploads/utils/file-schemas when upload infrastructure is ported
const FileInputSchema = z.union([
  z.string(),
  z.object({
    name: z.string().optional(),
    type: z.string().optional(),
    data: z.string().optional(),
    url: z.string().optional(),
  }).passthrough(),
])

const SupabaseStorageUploadSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  apiKey: z.string().min(1, 'API key is required'),
  bucket: z.string().min(1, 'Bucket name is required'),
  fileName: z.string().min(1, 'File name is required'),
  path: z.string().optional().nullable(),
  fileData: FileInputSchema,
  contentType: z.string().optional().nullable(),
  upsert: z.boolean().optional().default(false),
})

export async function POST(request: NextRequest) {
  const requestId = randomUUID().slice(0, 8)

  try {
    const body = await request.json()
    const validatedData = SupabaseStorageUploadSchema.parse(body)

    const fileData = validatedData.fileData
    const isStringInput = typeof fileData === 'string'

    logger.info(`[${requestId}] Uploading to Supabase Storage`, {
      bucket: validatedData.bucket,
      fileName: validatedData.fileName,
      path: validatedData.path,
      fileDataType: isStringInput ? 'string' : 'object',
    })

    if (!fileData) {
      return NextResponse.json(
        {
          success: false,
          error: 'fileData is required',
        },
        { status: 400 }
      )
    }

    let uploadBody: Buffer
    let uploadContentType: string | undefined

    if (isStringInput) {
      let content = fileData as string

      const dataUrlMatch = content.match(/^data:([^;]+);base64,(.+)$/)
      if (dataUrlMatch) {
        const [, mimeType, base64Data] = dataUrlMatch
        content = base64Data
        if (!validatedData.contentType) {
          uploadContentType = mimeType
        }
        logger.info(`[${requestId}] Extracted base64 from data URL (MIME: ${mimeType})`)
      }

      const cleanedContent = content.replace(/[\s\r\n]/g, '')
      const isLikelyBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(cleanedContent)

      if (isLikelyBase64 && cleanedContent.length >= 4) {
        try {
          uploadBody = Buffer.from(cleanedContent, 'base64')

          const expectedMinSize = Math.floor(cleanedContent.length * 0.7)
          const expectedMaxSize = Math.ceil(cleanedContent.length * 0.8)

          if (
            uploadBody.length >= expectedMinSize &&
            uploadBody.length <= expectedMaxSize &&
            uploadBody.length > 0
          ) {
            logger.info(
              `[${requestId}] Decoded base64 content: ${cleanedContent.length} chars -> ${uploadBody.length} bytes`
            )
          } else {
            const reEncoded = uploadBody.toString('base64')
            if (reEncoded !== cleanedContent) {
              logger.info(
                `[${requestId}] Content looked like base64 but re-encoding didn't match, using as plain text`
              )
              uploadBody = Buffer.from(content, 'utf-8')
            } else {
              logger.info(
                `[${requestId}] Decoded base64 content (verified): ${uploadBody.length} bytes`
              )
            }
          }
        } catch (decodeError) {
          logger.info(
            `[${requestId}] Failed to decode as base64, using as plain text: ${decodeError}`
          )
          uploadBody = Buffer.from(content, 'utf-8')
        }
      } else {
        uploadBody = Buffer.from(content, 'utf-8')
        logger.info(`[${requestId}] Using content as plain text (${uploadBody.length} bytes)`)
      }

      uploadContentType =
        uploadContentType || validatedData.contentType || 'application/octet-stream'
    } else {
      // TODO: Wire processSingleFileToUserFile and downloadFileFromStorage from @/lib/uploads/utils/
      // when upload infrastructure is ported. For now, only string fileData is supported.
      return NextResponse.json(
        {
          success: false,
          error: 'Object fileData is not yet supported. Please provide fileData as a string (base64 or plain text).',
        },
        { status: 400 }
      )
    }

    let fullPath = validatedData.fileName
    if (validatedData.path) {
      const folderPath = validatedData.path.endsWith('/')
        ? validatedData.path
        : `${validatedData.path}/`
      fullPath = `${folderPath}${validatedData.fileName}`
    }

    const supabaseUrl = `https://${validatedData.projectId}.supabase.co/storage/v1/object/${validatedData.bucket}/${fullPath}`

    const headers: Record<string, string> = {
      apikey: validatedData.apiKey,
      Authorization: `Bearer ${validatedData.apiKey}`,
      'Content-Type': uploadContentType!,
    }

    if (validatedData.upsert) {
      headers['x-upsert'] = 'true'
    }

    logger.info(`[${requestId}] Sending to Supabase: ${supabaseUrl}`, {
      contentType: uploadContentType,
      bodySize: uploadBody.length,
      upsert: validatedData.upsert,
    })

    const response = await fetch(supabaseUrl, {
      method: 'POST',
      headers,
      body: new Uint8Array(uploadBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { message: errorText }
      }

      logger.error(`[${requestId}] Supabase Storage upload failed:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      })

      return NextResponse.json(
        {
          success: false,
          error: errorData.message || errorData.error || `Upload failed: ${response.statusText}`,
          details: errorData,
        },
        { status: response.status }
      )
    }

    const result = await response.json()

    logger.info(`[${requestId}] File uploaded successfully to Supabase Storage`, {
      bucket: validatedData.bucket,
      path: fullPath,
    })

    const publicUrl = `https://${validatedData.projectId}.supabase.co/storage/v1/object/public/${validatedData.bucket}/${fullPath}`

    return NextResponse.json({
      success: true,
      output: {
        message: 'Successfully uploaded file to storage',
        results: {
          ...result,
          path: fullPath,
          bucket: validatedData.bucket,
          publicUrl,
        },
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid request data`, { errors: error.issues })
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.issues,
        },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Error uploading to Supabase Storage:`, error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
