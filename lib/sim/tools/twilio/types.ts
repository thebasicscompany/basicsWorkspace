import type { ToolResponse } from '@/lib/sim/tools/types'

export interface TwilioSendSMSParams {
  phoneNumbers: string
  message: string
  accountSid: string
  authToken: string
  fromNumber: string
}

export interface TwilioSMSBlockOutput extends ToolResponse {
  output: {
    success: boolean
    messageId?: string
    status?: string
    error?: string
  }
}
