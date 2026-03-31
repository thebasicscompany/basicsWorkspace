// Phase 4 stub — SMS sending service
// Will integrate with Twilio or similar SMS gateway

export interface SMSOptions {
  to: string
  body: string
  from: string
}

export interface SMSResult {
  success: boolean
  message: string
  sid?: string
}

/**
 * Send an SMS message.
 * Phase 4 stub: throws — requires Twilio credentials and SDK.
 */
export async function sendSMS(options: SMSOptions): Promise<SMSResult> {
  throw new Error(
    `SMS sending not implemented (Phase 4). ` +
      `Attempted to send to ${options.to} from ${options.from}`
  )
}
