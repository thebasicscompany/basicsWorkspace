import { deleteChannelMessageTool } from '@/lib/sim/tools/microsoft_teams/delete_channel_message'
import { deleteChatMessageTool } from '@/lib/sim/tools/microsoft_teams/delete_chat_message'
import { getMessageTool } from '@/lib/sim/tools/microsoft_teams/get_message'
import { listChannelMembersTool } from '@/lib/sim/tools/microsoft_teams/list_channel_members'
import { listTeamMembersTool } from '@/lib/sim/tools/microsoft_teams/list_team_members'
import { readChannelTool } from '@/lib/sim/tools/microsoft_teams/read_channel'
import { readChatTool } from '@/lib/sim/tools/microsoft_teams/read_chat'
import { replyToMessageTool } from '@/lib/sim/tools/microsoft_teams/reply_to_message'
import { setReactionTool } from '@/lib/sim/tools/microsoft_teams/set_reaction'
import { unsetReactionTool } from '@/lib/sim/tools/microsoft_teams/unset_reaction'
import { updateChannelMessageTool } from '@/lib/sim/tools/microsoft_teams/update_channel_message'
import { updateChatMessageTool } from '@/lib/sim/tools/microsoft_teams/update_chat_message'
import { writeChannelTool } from '@/lib/sim/tools/microsoft_teams/write_channel'
import { writeChatTool } from '@/lib/sim/tools/microsoft_teams/write_chat'

export const microsoftTeamsReadChannelTool = readChannelTool
export const microsoftTeamsReadChatTool = readChatTool
export const microsoftTeamsGetMessageTool = getMessageTool
export const microsoftTeamsWriteChannelTool = writeChannelTool
export const microsoftTeamsWriteChatTool = writeChatTool
export const microsoftTeamsUpdateChatMessageTool = updateChatMessageTool
export const microsoftTeamsUpdateChannelMessageTool = updateChannelMessageTool
export const microsoftTeamsDeleteChatMessageTool = deleteChatMessageTool
export const microsoftTeamsDeleteChannelMessageTool = deleteChannelMessageTool
export const microsoftTeamsReplyToMessageTool = replyToMessageTool
export const microsoftTeamsSetReactionTool = setReactionTool
export const microsoftTeamsUnsetReactionTool = unsetReactionTool
export const microsoftTeamsListTeamMembersTool = listTeamMembersTool
export const microsoftTeamsListChannelMembersTool = listChannelMembersTool
