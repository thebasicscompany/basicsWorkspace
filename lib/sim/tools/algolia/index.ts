import { addRecordTool } from '@/lib/sim/tools/algolia/add_record'
import { batchOperationsTool } from '@/lib/sim/tools/algolia/batch_operations'
import { browseRecordsTool } from '@/lib/sim/tools/algolia/browse_records'
import { clearRecordsTool } from '@/lib/sim/tools/algolia/clear_records'
import { copyMoveIndexTool } from '@/lib/sim/tools/algolia/copy_move_index'
import { deleteByFilterTool } from '@/lib/sim/tools/algolia/delete_by_filter'
import { deleteIndexTool } from '@/lib/sim/tools/algolia/delete_index'
import { deleteRecordTool } from '@/lib/sim/tools/algolia/delete_record'
import { getRecordTool } from '@/lib/sim/tools/algolia/get_record'
import { getRecordsTool } from '@/lib/sim/tools/algolia/get_records'
import { getSettingsTool } from '@/lib/sim/tools/algolia/get_settings'
import { listIndicesTool } from '@/lib/sim/tools/algolia/list_indices'
import { partialUpdateRecordTool } from '@/lib/sim/tools/algolia/partial_update_record'
import { searchTool } from '@/lib/sim/tools/algolia/search'
import { updateSettingsTool } from '@/lib/sim/tools/algolia/update_settings'

export const algoliaSearchTool = searchTool
export const algoliaAddRecordTool = addRecordTool
export const algoliaGetRecordTool = getRecordTool
export const algoliaGetRecordsTool = getRecordsTool
export const algoliaDeleteRecordTool = deleteRecordTool
export const algoliaPartialUpdateRecordTool = partialUpdateRecordTool
export const algoliaBrowseRecordsTool = browseRecordsTool
export const algoliaBatchOperationsTool = batchOperationsTool
export const algoliaListIndicesTool = listIndicesTool
export const algoliaGetSettingsTool = getSettingsTool
export const algoliaUpdateSettingsTool = updateSettingsTool
export const algoliaDeleteIndexTool = deleteIndexTool
export const algoliaCopyMoveIndexTool = copyMoveIndexTool
export const algoliaClearRecordsTool = clearRecordsTool
export const algoliaDeleteByFilterTool = deleteByFilterTool
