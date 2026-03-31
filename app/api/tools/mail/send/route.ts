import { type NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'
import { generateRequestId } from '@/lib/core/utils/request'

export const dynamic = 'force-dynamic'

const logger = { info: (...args: any[]) => console.log('[mail-send]', ...args), warn: (...args: any[]) => console.warn('[mail-send]', ...args), error: (...args: any[]) => console.error('[mail-send]', ...args) }

const MailSendSchema = z.object({
  fromAddress: z.string().min(1, 'From address is required'),
  to: z.string().min(1, 'To email is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Email body is required'),
  contentType: z.enum(['text', 'html']).optional().nullable(),
  resendApiKey: z.string().min(1, 'Resend API key is required'),
  cc: z
    .union([z.string().min(1), z.array(z.string().min(1))])
    .optional()
    .nullable(),
  bcc: z
    .union([z.string().min(1), z.array(z.string().min(1))])
    .optional()
    .nullable(),
  replyTo: z
    .union([z.string().min(1), z.array(z.string().min(1))])
    .optional()
    .nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
  tags: z.string().optional().nullable(),
})

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const body = await request.json()
    const validatedData = MailSendSchema.parse(body)

    logger.info(`[${requestId}] Sending email with user-provided Resend API key`, {
      to: validatedData.to,
      subject: validatedData.subject,
      bodyLength: validatedData.body.length,
      from: validatedData.fromAddress,
    })

    const resend = new Resend(validatedData.resendApiKey)

    const contentType = validatedData.contentType || 'text'
    const emailData: Record<string, unknown> = {
      from: validatedData.fromAddress,
      to: validatedData.to,
      subject: validatedData.subject,
    }

    if (contentType === 'html') {
      emailData.html = validatedData.body
      emailData.text = validatedData.body.replace(/<[^>]*>/g, '')
    } else {
      emailData.text = validatedData.body
    }

    if (validatedData.cc) {
      emailData.cc = validatedData.cc
    }

    if (validatedData.bcc) {
      emailData.bcc = validatedData.bcc
    }

    if (validatedData.replyTo) {
      emailData.replyTo = validatedData.replyTo
    }

    if (validatedData.scheduledAt) {
      emailData.scheduledAt = validatedData.scheduledAt
    }

    if (validatedData.tags) {
      const tagPairs = validatedData.tags.split(',').map((pair) => {
        const trimmed = pair.trim()
        const colonIndex = trimmed.indexOf(':')
        if (colonIndex === -1) return null
        const name = trimmed.substring(0, colonIndex).trim()
        const value = trimmed.substring(colonIndex + 1).trim()
        return { name, value: value || '' }
      })
      emailData.tags = tagPairs.filter(
        (tag): tag is { name: string; value: string } => tag !== null && !!tag.name
      )
    }

    const { data, error } = await resend.emails.send(
      emailData as unknown as Parameters<typeof resend.emails.send>[0]
    )

    if (error) {
      logger.error(`[${requestId}] Email sending failed:`, error)
      return NextResponse.json(
        {
          success: false,
          message: `Failed to send email: ${error.message || 'Unknown error'}`,
        },
        { status: 500 }
      )
    }

    const result = {
      success: true,
      message: 'Email sent successfully via Resend',
      data,
    }

    logger.info(`[${requestId}] Email send result`, {
      success: result.success,
      message: result.message,
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid request data`, { errors: error.issues })
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request data',
          errors: error.issues,
        },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Error sending email via API:`, error)

    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error while sending email',
        data: {},
      },
      { status: 500 }
    )
  }
}
