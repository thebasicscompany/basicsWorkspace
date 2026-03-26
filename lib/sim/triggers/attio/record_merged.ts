import { AttioIcon } from '@/components/icons'
import { buildAttioTriggerSubBlocks, buildRecordMergedEventOutputs } from '@/lib/sim/triggers/attio/utils'
import type { TriggerConfig } from '@/lib/sim/triggers/types'

/**
 * Attio Record Merged Trigger
 *
 * Triggers when two records are merged in Attio.
 */
export const attioRecordMergedTrigger: TriggerConfig = {
  id: 'attio_record_merged',
  name: 'Attio Record Merged',
  provider: 'attio',
  description: 'Trigger workflow when two records are merged in Attio',
  version: '1.0.0',
  icon: AttioIcon,

  subBlocks: buildAttioTriggerSubBlocks('attio_record_merged'),

  outputs: buildRecordMergedEventOutputs(),

  webhook: {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Attio-Signature': 'hmac-sha256-signature',
    },
  },
}
