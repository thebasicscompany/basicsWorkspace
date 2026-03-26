import { createBucketTool } from '@/lib/sim/tools/microsoft_planner/create_bucket'
import { createTaskTool } from '@/lib/sim/tools/microsoft_planner/create_task'
import { deleteBucketTool } from '@/lib/sim/tools/microsoft_planner/delete_bucket'
import { deleteTaskTool } from '@/lib/sim/tools/microsoft_planner/delete_task'
import { getTaskDetailsTool } from '@/lib/sim/tools/microsoft_planner/get_task_details'
import { listBucketsTool } from '@/lib/sim/tools/microsoft_planner/list_buckets'
import { listPlansTool } from '@/lib/sim/tools/microsoft_planner/list_plans'
import { readBucketTool } from '@/lib/sim/tools/microsoft_planner/read_bucket'
import { readPlanTool } from '@/lib/sim/tools/microsoft_planner/read_plan'
import { readTaskTool } from '@/lib/sim/tools/microsoft_planner/read_task'
import { updateBucketTool } from '@/lib/sim/tools/microsoft_planner/update_bucket'
import { updateTaskTool } from '@/lib/sim/tools/microsoft_planner/update_task'
import { updateTaskDetailsTool } from '@/lib/sim/tools/microsoft_planner/update_task_details'

export const microsoftPlannerCreateTaskTool = createTaskTool
export const microsoftPlannerReadTaskTool = readTaskTool
export const microsoftPlannerUpdateTaskTool = updateTaskTool
export const microsoftPlannerDeleteTaskTool = deleteTaskTool
export const microsoftPlannerListPlansTool = listPlansTool
export const microsoftPlannerReadPlanTool = readPlanTool
export const microsoftPlannerListBucketsTool = listBucketsTool
export const microsoftPlannerReadBucketTool = readBucketTool
export const microsoftPlannerCreateBucketTool = createBucketTool
export const microsoftPlannerUpdateBucketTool = updateBucketTool
export const microsoftPlannerDeleteBucketTool = deleteBucketTool
export const microsoftPlannerGetTaskDetailsTool = getTaskDetailsTool
export const microsoftPlannerUpdateTaskDetailsTool = updateTaskDetailsTool
