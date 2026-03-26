import { AttioIcon } from '@/components/icons'
import { buildAttioTriggerSubBlocks, buildTaskOutputs } from '@/lib/sim/triggers/attio/utils'
import type { TriggerConfig } from '@/lib/sim/triggers/types'

/**
 * Attio Task Created Trigger
 *
 * Triggers when a task is created in Attio.
 */
export const attioTaskCreatedTrigger: TriggerConfig = {
  id: 'attio_task_created',
  name: 'Attio Task Created',
  provider: 'attio',
  description: 'Trigger workflow when a new task is created in Attio',
  version: '1.0.0',
  icon: AttioIcon,

  subBlocks: buildAttioTriggerSubBlocks('attio_task_created'),

  outputs: buildTaskOutputs(),

  webhook: {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Attio-Signature': 'hmac-sha256-signature',
    },
  },
}
