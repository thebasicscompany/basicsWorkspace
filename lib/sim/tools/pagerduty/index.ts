import { addNoteTool } from '@/lib/sim/tools/pagerduty/add_note'
import { createIncidentTool } from '@/lib/sim/tools/pagerduty/create_incident'
import { listIncidentsTool } from '@/lib/sim/tools/pagerduty/list_incidents'
import { listOncallsTool } from '@/lib/sim/tools/pagerduty/list_oncalls'
import { listServicesTool } from '@/lib/sim/tools/pagerduty/list_services'
import { updateIncidentTool } from '@/lib/sim/tools/pagerduty/update_incident'

export const pagerdutyListIncidentsTool = listIncidentsTool
export const pagerdutyCreateIncidentTool = createIncidentTool
export const pagerdutyUpdateIncidentTool = updateIncidentTool
export const pagerdutyAddNoteTool = addNoteTool
export const pagerdutyListServicesTool = listServicesTool
export const pagerdutyListOncallsTool = listOncallsTool
