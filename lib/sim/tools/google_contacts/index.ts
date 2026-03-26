import { createTool } from '@/lib/sim/tools/google_contacts/create'
import { deleteTool } from '@/lib/sim/tools/google_contacts/delete'
import { getTool } from '@/lib/sim/tools/google_contacts/get'
import { listTool } from '@/lib/sim/tools/google_contacts/list'
import { searchTool } from '@/lib/sim/tools/google_contacts/search'
import { updateTool } from '@/lib/sim/tools/google_contacts/update'

export const googleContactsCreateTool = createTool
export const googleContactsDeleteTool = deleteTool
export const googleContactsGetTool = getTool
export const googleContactsListTool = listTool
export const googleContactsSearchTool = searchTool
export const googleContactsUpdateTool = updateTool
