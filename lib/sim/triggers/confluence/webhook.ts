import { ConfluenceIcon } from '@/components/icons'
import { buildTriggerSubBlocks } from '@/lib/sim/triggers'
import {
  buildConfluenceAttachmentExtraFields,
  buildGenericWebhookOutputs,
  confluenceSetupInstructions,
  confluenceTriggerOptions,
} from '@/lib/sim/triggers/confluence/utils'
import type { TriggerConfig } from '@/lib/sim/triggers/types'

/**
 * Generic Confluence Webhook Trigger
 *
 * Captures all Confluence webhook events without filtering.
 */
export const confluenceWebhookTrigger: TriggerConfig = {
  id: 'confluence_webhook',
  name: 'Confluence Webhook (All Events)',
  provider: 'confluence',
  description: 'Trigger workflow on any Confluence webhook event',
  version: '1.0.0',
  icon: ConfluenceIcon,

  subBlocks: buildTriggerSubBlocks({
    triggerId: 'confluence_webhook',
    triggerOptions: confluenceTriggerOptions,
    setupInstructions: confluenceSetupInstructions('All Events'),
    extraFields: buildConfluenceAttachmentExtraFields('confluence_webhook'),
  }),

  outputs: buildGenericWebhookOutputs(),

  webhook: {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Hub-Signature': 'sha256=...',
      'X-Atlassian-Webhook-Identifier': 'unique-webhook-id',
    },
  },
}
