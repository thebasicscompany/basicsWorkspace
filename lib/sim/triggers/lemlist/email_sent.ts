import { LemlistIcon } from '@/components/icons'
import { buildTriggerSubBlocks } from '@/lib/sim/triggers'
import {
  buildEmailSentOutputs,
  buildLemlistExtraFields,
  lemlistSetupInstructions,
  lemlistTriggerOptions,
} from '@/lib/sim/triggers/lemlist/utils'
import type { TriggerConfig } from '@/lib/sim/triggers/types'

/**
 * Lemlist Email Sent Trigger
 * Triggers when an email is sent in a Lemlist campaign
 */
export const lemlistEmailSentTrigger: TriggerConfig = {
  id: 'lemlist_email_sent',
  name: 'Lemlist Email Sent',
  provider: 'lemlist',
  description: 'Trigger workflow when an email is sent',
  version: '1.0.0',
  icon: LemlistIcon,

  subBlocks: buildTriggerSubBlocks({
    triggerId: 'lemlist_email_sent',
    triggerOptions: lemlistTriggerOptions,
    setupInstructions: lemlistSetupInstructions('emailsSent'),
    extraFields: buildLemlistExtraFields('lemlist_email_sent'),
  }),

  outputs: buildEmailSentOutputs(),

  webhook: {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  },
}
