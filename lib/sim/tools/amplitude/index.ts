import { eventSegmentationTool } from '@/lib/sim/tools/amplitude/event_segmentation'
import { getActiveUsersTool } from '@/lib/sim/tools/amplitude/get_active_users'
import { getRevenueTool } from '@/lib/sim/tools/amplitude/get_revenue'
import { groupIdentifyTool } from '@/lib/sim/tools/amplitude/group_identify'
import { identifyUserTool } from '@/lib/sim/tools/amplitude/identify_user'
import { listEventsTool } from '@/lib/sim/tools/amplitude/list_events'
import { realtimeActiveUsersTool } from '@/lib/sim/tools/amplitude/realtime_active_users'
import { sendEventTool } from '@/lib/sim/tools/amplitude/send_event'
import { userActivityTool } from '@/lib/sim/tools/amplitude/user_activity'
import { userProfileTool } from '@/lib/sim/tools/amplitude/user_profile'
import { userSearchTool } from '@/lib/sim/tools/amplitude/user_search'

export const amplitudeSendEventTool = sendEventTool
export const amplitudeIdentifyUserTool = identifyUserTool
export const amplitudeGroupIdentifyTool = groupIdentifyTool
export const amplitudeUserSearchTool = userSearchTool
export const amplitudeUserActivityTool = userActivityTool
export const amplitudeUserProfileTool = userProfileTool
export const amplitudeEventSegmentationTool = eventSegmentationTool
export const amplitudeGetActiveUsersTool = getActiveUsersTool
export const amplitudeRealtimeActiveUsersTool = realtimeActiveUsersTool
export const amplitudeListEventsTool = listEventsTool
export const amplitudeGetRevenueTool = getRevenueTool
