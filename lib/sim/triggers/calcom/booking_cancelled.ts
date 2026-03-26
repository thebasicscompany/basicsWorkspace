import { CalComIcon } from '@/components/icons'
import { buildTriggerSubBlocks } from '@/lib/sim/triggers'
import {
  buildCancelledOutputs,
  calcomSetupInstructions,
  calcomTriggerOptions,
  calcomWebhookSecretField,
} from '@/lib/sim/triggers/calcom/utils'
import type { TriggerConfig } from '@/lib/sim/triggers/types'

export const calcomBookingCancelledTrigger: TriggerConfig = {
  id: 'calcom_booking_cancelled',
  name: 'CalCom Booking Cancelled',
  provider: 'calcom',
  description: 'Trigger workflow when a booking is cancelled in Cal.com',
  version: '1.0.0',
  icon: CalComIcon,

  subBlocks: buildTriggerSubBlocks({
    triggerId: 'calcom_booking_cancelled',
    triggerOptions: calcomTriggerOptions,
    setupInstructions: calcomSetupInstructions('cancelled'),
    extraFields: [calcomWebhookSecretField('calcom_booking_cancelled')],
  }),

  outputs: buildCancelledOutputs(),

  webhook: {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Cal-Signature-256': '<hmac-sha256-hex>',
    },
  },
}
