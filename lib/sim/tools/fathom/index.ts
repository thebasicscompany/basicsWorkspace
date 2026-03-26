import { getSummaryTool } from '@/lib/sim/tools/fathom/get_summary'
import { getTranscriptTool } from '@/lib/sim/tools/fathom/get_transcript'
import { listMeetingsTool } from '@/lib/sim/tools/fathom/list_meetings'
import { listTeamMembersTool } from '@/lib/sim/tools/fathom/list_team_members'
import { listTeamsTool } from '@/lib/sim/tools/fathom/list_teams'

export const fathomGetSummaryTool = getSummaryTool
export const fathomGetTranscriptTool = getTranscriptTool
export const fathomListMeetingsTool = listMeetingsTool
export const fathomListTeamMembersTool = listTeamMembersTool
export const fathomListTeamsTool = listTeamsTool

export * from './types'
