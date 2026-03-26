/**
 * Handler Registry
 *
 * Central registry for all block handlers.
 * Creates handlers for real user blocks (not infrastructure like sentinels).
 */

import { AgentBlockHandler } from '@/lib/sim/executor/handlers/agent/agent-handler'
import { ApiBlockHandler } from '@/lib/sim/executor/handlers/api/api-handler'
import { ConditionBlockHandler } from '@/lib/sim/executor/handlers/condition/condition-handler'
import { EvaluatorBlockHandler } from '@/lib/sim/executor/handlers/evaluator/evaluator-handler'
import { FunctionBlockHandler } from '@/lib/sim/executor/handlers/function/function-handler'
import { GenericBlockHandler } from '@/lib/sim/executor/handlers/generic/generic-handler'
import { HumanInTheLoopBlockHandler } from '@/lib/sim/executor/handlers/human-in-the-loop/human-in-the-loop-handler'
import { MothershipBlockHandler } from '@/lib/sim/executor/handlers/mothership/mothership-handler'
import { ResponseBlockHandler } from '@/lib/sim/executor/handlers/response/response-handler'
import { RouterBlockHandler } from '@/lib/sim/executor/handlers/router/router-handler'
import { TriggerBlockHandler } from '@/lib/sim/executor/handlers/trigger/trigger-handler'
import { VariablesBlockHandler } from '@/lib/sim/executor/handlers/variables/variables-handler'
import { WaitBlockHandler } from '@/lib/sim/executor/handlers/wait/wait-handler'
import { WorkflowBlockHandler } from '@/lib/sim/executor/handlers/workflow/workflow-handler'
import type { BlockHandler } from '@/lib/sim/executor/types'

/**
 * Create all block handlers
 *
 * Note: Sentinels are NOT included here - they're infrastructure handled
 * by NodeExecutionOrchestrator, not user blocks.
 */
export function createBlockHandlers(): BlockHandler[] {
  return [
    new TriggerBlockHandler(),
    new FunctionBlockHandler(),
    new ApiBlockHandler(),
    new ConditionBlockHandler(),
    new RouterBlockHandler(),
    new ResponseBlockHandler(),
    new HumanInTheLoopBlockHandler(),
    new AgentBlockHandler(),
    new MothershipBlockHandler(),
    new VariablesBlockHandler(),
    new WorkflowBlockHandler(),
    new WaitBlockHandler(),
    new EvaluatorBlockHandler(),
    new GenericBlockHandler(),
  ]
}
