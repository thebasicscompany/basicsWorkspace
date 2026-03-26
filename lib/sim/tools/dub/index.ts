import { createLinkTool } from '@/lib/sim/tools/dub/create_link'
import { deleteLinkTool } from '@/lib/sim/tools/dub/delete_link'
import { getAnalyticsTool } from '@/lib/sim/tools/dub/get_analytics'
import { getLinkTool } from '@/lib/sim/tools/dub/get_link'
import { listLinksTool } from '@/lib/sim/tools/dub/list_links'
import { updateLinkTool } from '@/lib/sim/tools/dub/update_link'
import { upsertLinkTool } from '@/lib/sim/tools/dub/upsert_link'

export const dubCreateLinkTool = createLinkTool
export const dubGetLinkTool = getLinkTool
export const dubUpdateLinkTool = updateLinkTool
export const dubUpsertLinkTool = upsertLinkTool
export const dubDeleteLinkTool = deleteLinkTool
export const dubListLinksTool = listLinksTool
export const dubGetAnalyticsTool = getAnalyticsTool
