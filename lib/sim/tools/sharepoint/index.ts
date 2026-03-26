import { addListItemTool } from '@/lib/sim/tools/sharepoint/add_list_items'
import { createListTool } from '@/lib/sim/tools/sharepoint/create_list'
import { createPageTool } from '@/lib/sim/tools/sharepoint/create_page'
import { getListTool } from '@/lib/sim/tools/sharepoint/get_list'
import { listSitesTool } from '@/lib/sim/tools/sharepoint/list_sites'
import { readPageTool } from '@/lib/sim/tools/sharepoint/read_page'
import { updateListItemTool } from '@/lib/sim/tools/sharepoint/update_list'
import { uploadFileTool } from '@/lib/sim/tools/sharepoint/upload_file'

export const sharepointCreatePageTool = createPageTool
export const sharepointCreateListTool = createListTool
export const sharepointGetListTool = getListTool
export const sharepointListSitesTool = listSitesTool
export const sharepointReadPageTool = readPageTool
export const sharepointUpdateListItemTool = updateListItemTool
export const sharepointAddListItemTool = addListItemTool
export const sharepointUploadFileTool = uploadFileTool
