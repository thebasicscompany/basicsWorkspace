import type { UserFile } from '@/lib/sim/executor/types'
import type { ToolResponse } from '@/lib/sim/tools/types'

export interface SmtpConnectionConfig {
  smtpHost: string
  smtpPort: number
  smtpUsername: string
  smtpPassword: string
  smtpSecure: 'TLS' | 'SSL' | 'None'
}

export interface SmtpSendMailParams extends SmtpConnectionConfig {
  // Email content
  from: string
  to: string
  subject: string
  body: string
  contentType?: 'text' | 'html'

  // Optional fields
  fromName?: string
  cc?: string
  bcc?: string
  replyTo?: string
  attachments?: UserFile[]
}

export interface SmtpSendMailResult extends ToolResponse {
  output: {
    success: boolean
    messageId?: string
    to?: string
    subject?: string
  }
}
