import { CalComIcon } from '@/components/icons'
import { buildTriggerSubBlocks } from '@/lib/sim/triggers'
import {
  buildGenericOutputs,
  calcomSetupInstructions,
  calcomTriggerOptions,
  calcomWebhookSecretField,
} from '@/lib/sim/triggers/calcom/utils'
import type { TriggerConfig } from '@/lib/sim/triggers/types'

/**
 * Generic Cal.com webhook trigger that accepts any event type.
 * Use this when you need to handle events not covered by specific triggers,
 * or when you want to receive multiple event types on the same webhook.
 */
export const calcomWebhookTrigger: TriggerConfig = {
  id: 'calcom_webhook',
  name: 'CalCom Webhook (All Events)',
  provider: 'calcom',
  description: 'Trigger workflow on any Cal.com webhook event (configure event types in Cal.com)',
  version: '1.0.0',
  icon: CalComIcon,

  subBlocks: buildTriggerSubBlocks({
    triggerId: 'calcom_webhook',
    triggerOptions: calcomTriggerOptions,
    setupInstructions: calcomSetupInstructions('generic'),
    extraFields: [calcomWebhookSecretField('calcom_webhook')],
  }),

  outputs: buildGenericOutputs(),

  webhook: {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Cal-Signature-256': '<hmac-sha256-hex>',
    },
  },
}
