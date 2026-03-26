import { createFormTool } from '@/lib/sim/tools/typeform/create_form'
import { deleteFormTool } from '@/lib/sim/tools/typeform/delete_form'
import { filesTool } from '@/lib/sim/tools/typeform/files'
import { getFormTool } from '@/lib/sim/tools/typeform/get_form'
import { insightsTool } from '@/lib/sim/tools/typeform/insights'
import { listFormsTool } from '@/lib/sim/tools/typeform/list_forms'
import { responsesTool } from '@/lib/sim/tools/typeform/responses'
import { updateFormTool } from '@/lib/sim/tools/typeform/update_form'

export const typeformResponsesTool = responsesTool
export const typeformFilesTool = filesTool
export const typeformInsightsTool = insightsTool
export const typeformListFormsTool = listFormsTool
export const typeformGetFormTool = getFormTool
export const typeformCreateFormTool = createFormTool
export const typeformUpdateFormTool = updateFormTool
export const typeformDeleteFormTool = deleteFormTool
