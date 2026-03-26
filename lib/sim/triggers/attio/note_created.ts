import { AttioIcon } from '@/components/icons'
import { buildAttioTriggerSubBlocks, buildNoteOutputs } from '@/lib/sim/triggers/attio/utils'
import type { TriggerConfig } from '@/lib/sim/triggers/types'

/**
 * Attio Note Created Trigger
 *
 * Triggers when a note is created in Attio.
 */
export const attioNoteCreatedTrigger: TriggerConfig = {
  id: 'attio_note_created',
  name: 'Attio Note Created',
  provider: 'attio',
  description: 'Trigger workflow when a new note is created in Attio',
  version: '1.0.0',
  icon: AttioIcon,

  subBlocks: buildAttioTriggerSubBlocks('attio_note_created'),

  outputs: buildNoteOutputs(),

  webhook: {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Attio-Signature': 'hmac-sha256-signature',
    },
  },
}
