import { aggregateActivityTool } from '@/lib/sim/tools/gong/aggregate_activity'
import { answeredScorecardsTool } from '@/lib/sim/tools/gong/answered_scorecards'
import { getCallTool } from '@/lib/sim/tools/gong/get_call'
import { getCallTranscriptTool } from '@/lib/sim/tools/gong/get_call_transcript'
import { getCoachingTool } from '@/lib/sim/tools/gong/get_coaching'
import { getExtensiveCallsTool } from '@/lib/sim/tools/gong/get_extensive_calls'
import { getFolderContentTool } from '@/lib/sim/tools/gong/get_folder_content'
import { getUserTool } from '@/lib/sim/tools/gong/get_user'
import { interactionStatsTool } from '@/lib/sim/tools/gong/interaction_stats'
import { listCallsTool } from '@/lib/sim/tools/gong/list_calls'
import { listFlowsTool } from '@/lib/sim/tools/gong/list_flows'
import { listLibraryFoldersTool } from '@/lib/sim/tools/gong/list_library_folders'
import { listScorecardsTool } from '@/lib/sim/tools/gong/list_scorecards'
import { listTrackersTool } from '@/lib/sim/tools/gong/list_trackers'
import { listUsersTool } from '@/lib/sim/tools/gong/list_users'
import { listWorkspacesTool } from '@/lib/sim/tools/gong/list_workspaces'
import { lookupEmailTool } from '@/lib/sim/tools/gong/lookup_email'
import { lookupPhoneTool } from '@/lib/sim/tools/gong/lookup_phone'

export const gongListCallsTool = listCallsTool
export const gongGetCallTool = getCallTool
export const gongGetCallTranscriptTool = getCallTranscriptTool
export const gongGetExtensiveCallsTool = getExtensiveCallsTool
export const gongListUsersTool = listUsersTool
export const gongGetUserTool = getUserTool
export const gongAggregateActivityTool = aggregateActivityTool
export const gongInteractionStatsTool = interactionStatsTool
export const gongAnsweredScorecardsTool = answeredScorecardsTool
export const gongListLibraryFoldersTool = listLibraryFoldersTool
export const gongGetFolderContentTool = getFolderContentTool
export const gongListScorecardsTool = listScorecardsTool
export const gongListTrackersTool = listTrackersTool
export const gongListWorkspacesTool = listWorkspacesTool
export const gongListFlowsTool = listFlowsTool
export const gongGetCoachingTool = getCoachingTool
export const gongLookupEmailTool = lookupEmailTool
export const gongLookupPhoneTool = lookupPhoneTool
