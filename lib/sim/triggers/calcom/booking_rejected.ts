import { CalComIcon } from '@/components/icons'
import { buildTriggerSubBlocks } from '@/lib/sim/triggers'
import {
  buildRejectedOutputs,
  calcomSetupInstructions,
  calcomTriggerOptions,
  calcomWebhookSecretField,
} from '@/lib/sim/triggers/calcom/utils'
import type { TriggerConfig } from '@/lib/sim/triggers/types'

export const calcomBookingRejectedTrigger: TriggerConfig = {
  id: 'calcom_booking_rejected',
  name: 'CalCom Booking Rejected',
  provider: 'calcom',
  description: 'Trigger workflow when a booking request is rejected by the host',
  version: '1.0.0',
  icon: CalComIcon,

  subBlocks: buildTriggerSubBlocks({
    triggerId: 'calcom_booking_rejected',
    triggerOptions: calcomTriggerOptions,
    setupInstructions: calcomSetupInstructions('rejected'),
    extraFields: [calcomWebhookSecretField('calcom_booking_rejected')],
  }),

  outputs: buildRejectedOutputs(),

  webhook: {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Cal-Signature-256': '<hmac-sha256-hex>',
    },
  },
}
