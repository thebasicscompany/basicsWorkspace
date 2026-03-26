import { assignOnboardingTool } from '@/lib/sim/tools/workday/assign_onboarding'
import { changeJobTool } from '@/lib/sim/tools/workday/change_job'
import { createPrehireTool } from '@/lib/sim/tools/workday/create_prehire'
import { getCompensationTool } from '@/lib/sim/tools/workday/get_compensation'
import { getOrganizationsTool } from '@/lib/sim/tools/workday/get_organizations'
import { getWorkerTool } from '@/lib/sim/tools/workday/get_worker'
import { hireEmployeeTool } from '@/lib/sim/tools/workday/hire_employee'
import { listWorkersTool } from '@/lib/sim/tools/workday/list_workers'
import { terminateWorkerTool } from '@/lib/sim/tools/workday/terminate_worker'
import { updateWorkerTool } from '@/lib/sim/tools/workday/update_worker'

export {
  assignOnboardingTool as workdayAssignOnboardingTool,
  changeJobTool as workdayChangeJobTool,
  createPrehireTool as workdayCreatePrehireTool,
  getCompensationTool as workdayGetCompensationTool,
  getOrganizationsTool as workdayGetOrganizationsTool,
  getWorkerTool as workdayGetWorkerTool,
  hireEmployeeTool as workdayHireEmployeeTool,
  listWorkersTool as workdayListWorkersTool,
  terminateWorkerTool as workdayTerminateWorkerTool,
  updateWorkerTool as workdayUpdateWorkerTool,
}

export * from './types'
