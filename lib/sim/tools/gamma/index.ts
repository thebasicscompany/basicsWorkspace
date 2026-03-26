import { checkStatusTool } from '@/lib/sim/tools/gamma/check_status'
import { generateTool } from '@/lib/sim/tools/gamma/generate'
import { generateFromTemplateTool } from '@/lib/sim/tools/gamma/generate_from_template'
import { listFoldersTool } from '@/lib/sim/tools/gamma/list_folders'
import { listThemesTool } from '@/lib/sim/tools/gamma/list_themes'

export const gammaGenerateTool = generateTool
export const gammaGenerateFromTemplateTool = generateFromTemplateTool
export const gammaCheckStatusTool = checkStatusTool
export const gammaListThemesTool = listThemesTool
export const gammaListFoldersTool = listFoldersTool
