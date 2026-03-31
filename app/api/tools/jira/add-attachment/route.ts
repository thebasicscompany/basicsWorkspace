import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getJiraCloudId } from '@/lib/tools/jira/utils'

const logger = { info: (...args: any[]) => console.log('[JiraAddAttachmentAPI]', ...args), warn: (...args: any[]) => console.warn('[JiraAddAttachmentAPI]', ...args), error: (...args: any[]) => console.error('[JiraAddAttachmentAPI]', ...args) }

export const dynamic = 'force-dynamic'

const JiraAddAttachmentSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
  domain: z.string().min(1, 'Domain is required'),
  issueKey: z.string().min(1, 'Issue key is required'),
  files: z.array(z.object({
    name: z.string(),
    type: z.string().optional(),
    data: z.string(), // base64 encoded
    size: z.number().optional(),
  })),
  cloudId: z.string().optional().nullable(),
})

export async function POST(request: NextRequest) {
  const requestId = `jira-attach-${Date.now()}`

  try {
    const body = await request.json()
    const validatedData = JiraAddAttachmentSchema.parse(body)

    if (validatedData.files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid files provided for upload' },
        { status: 400 }
      )
    }

    const cloudId =
      validatedData.cloudId ||
      (await getJiraCloudId(validatedData.domain, validatedData.accessToken))

    const formData = new FormData()

    for (const file of validatedData.files) {
      const buffer = Buffer.from(file.data, 'base64')
      const blob = new Blob([new Uint8Array(buffer)], {
        type: file.type || 'application/octet-stream',
      })
      formData.append('file', blob, file.name)
    }

    const url = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${validatedData.issueKey}/attachments`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${validatedData.accessToken}`,
        'X-Atlassian-Token': 'no-check',
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error(`[${requestId}] Jira attachment upload failed`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      })
      return NextResponse.json(
        {
          success: false,
          error: `Failed to upload attachments: ${response.statusText}`,
        },
        { status: response.status }
      )
    }

    const jiraAttachments = await response.json()
    const attachmentsList = Array.isArray(jiraAttachments) ? jiraAttachments : []

    const attachmentIds = attachmentsList.map((att: any) => att.id).filter(Boolean)
    const attachments = attachmentsList.map((att: any) => ({
      id: att.id ?? '',
      filename: att.filename ?? '',
      mimeType: att.mimeType ?? '',
      size: att.size ?? 0,
      content: att.content ?? '',
    }))

    return NextResponse.json({
      success: true,
      output: {
        ts: new Date().toISOString(),
        issueKey: validatedData.issueKey,
        attachments,
        attachmentIds,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Jira attachment upload error`, error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
