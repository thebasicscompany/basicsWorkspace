import { CalComIcon } from '@/components/icons'
import { buildTriggerSubBlocks } from '@/lib/sim/triggers'
import {
  buildBookingOutputs,
  calcomSetupInstructions,
  calcomTriggerOptions,
  calcomWebhookSecretField,
} from '@/lib/sim/triggers/calcom/utils'
import type { TriggerConfig } from '@/lib/sim/triggers/types'

export const calcomBookingCreatedTrigger: TriggerConfig = {
  id: 'calcom_booking_created',
  name: 'CalCom Booking Created',
  provider: 'calcom',
  description: 'Trigger workflow when a new booking is created in Cal.com',
  version: '1.0.0',
  icon: CalComIcon,

  subBlocks: buildTriggerSubBlocks({
    triggerId: 'calcom_booking_created',
    triggerOptions: calcomTriggerOptions,
    includeDropdown: true,
    setupInstructions: calcomSetupInstructions('created'),
    extraFields: [calcomWebhookSecretField('calcom_booking_created')],
  }),

  outputs: buildBookingOutputs(),

  webhook: {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Cal-Signature-256': '<hmac-sha256-hex>',
    },
  },
}
