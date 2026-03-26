import { batchUpdateTool } from '@/lib/sim/tools/google_forms/batch_update'
import { createFormTool } from '@/lib/sim/tools/google_forms/create_form'
import { createWatchTool } from '@/lib/sim/tools/google_forms/create_watch'
import { deleteWatchTool } from '@/lib/sim/tools/google_forms/delete_watch'
import { getFormTool } from '@/lib/sim/tools/google_forms/get_form'
import { getResponsesTool } from '@/lib/sim/tools/google_forms/get_responses'
import { listWatchesTool } from '@/lib/sim/tools/google_forms/list_watches'
import { renewWatchTool } from '@/lib/sim/tools/google_forms/renew_watch'
import { setPublishSettingsTool } from '@/lib/sim/tools/google_forms/set_publish_settings'

export const googleFormsGetResponsesTool = getResponsesTool
export const googleFormsGetFormTool = getFormTool
export const googleFormsCreateFormTool = createFormTool
export const googleFormsBatchUpdateTool = batchUpdateTool
export const googleFormsSetPublishSettingsTool = setPublishSettingsTool
export const googleFormsCreateWatchTool = createWatchTool
export const googleFormsListWatchesTool = listWatchesTool
export const googleFormsDeleteWatchTool = deleteWatchTool
export const googleFormsRenewWatchTool = renewWatchTool

export * from './types'
