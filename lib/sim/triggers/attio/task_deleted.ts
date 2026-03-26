import { AttioIcon } from '@/components/icons'
import { buildAttioTriggerSubBlocks, buildTaskOutputs } from '@/lib/sim/triggers/attio/utils'
import type { TriggerConfig } from '@/lib/sim/triggers/types'

/**
 * Attio Task Deleted Trigger
 *
 * Triggers when a task is deleted in Attio.
 */
export const attioTaskDeletedTrigger: TriggerConfig = {
  id: 'attio_task_deleted',
  name: 'Attio Task Deleted',
  provider: 'attio',
  description: 'Trigger workflow when a task is deleted in Attio',
  version: '1.0.0',
  icon: AttioIcon,

  subBlocks: buildAttioTriggerSubBlocks('attio_task_deleted'),

  outputs: buildTaskOutputs(),

  webhook: {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Attio-Signature': 'hmac-sha256-signature',
    },
  },
}
