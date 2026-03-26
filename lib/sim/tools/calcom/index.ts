import { cancelBookingTool } from '@/lib/sim/tools/calcom/cancel_booking'
import { confirmBookingTool } from '@/lib/sim/tools/calcom/confirm_booking'
import { createBookingTool } from '@/lib/sim/tools/calcom/create_booking'
import { createEventTypeTool } from '@/lib/sim/tools/calcom/create_event_type'
import { createScheduleTool } from '@/lib/sim/tools/calcom/create_schedule'
import { declineBookingTool } from '@/lib/sim/tools/calcom/decline_booking'
import { deleteEventTypeTool } from '@/lib/sim/tools/calcom/delete_event_type'
import { deleteScheduleTool } from '@/lib/sim/tools/calcom/delete_schedule'
import { getBookingTool } from '@/lib/sim/tools/calcom/get_booking'
import { getDefaultScheduleTool } from '@/lib/sim/tools/calcom/get_default_schedule'
import { getEventTypeTool } from '@/lib/sim/tools/calcom/get_event_type'
import { getScheduleTool } from '@/lib/sim/tools/calcom/get_schedule'
import { getSlotsTool } from '@/lib/sim/tools/calcom/get_slots'
import { listBookingsTool } from '@/lib/sim/tools/calcom/list_bookings'
import { listEventTypesTool } from '@/lib/sim/tools/calcom/list_event_types'
import { listSchedulesTool } from '@/lib/sim/tools/calcom/list_schedules'
import { rescheduleBookingTool } from '@/lib/sim/tools/calcom/reschedule_booking'
import { updateEventTypeTool } from '@/lib/sim/tools/calcom/update_event_type'
import { updateScheduleTool } from '@/lib/sim/tools/calcom/update_schedule'

export const calcomCancelBookingTool = cancelBookingTool
export const calcomConfirmBookingTool = confirmBookingTool
export const calcomCreateBookingTool = createBookingTool
export const calcomCreateEventTypeTool = createEventTypeTool
export const calcomCreateScheduleTool = createScheduleTool
export const calcomDeclineBookingTool = declineBookingTool
export const calcomDeleteEventTypeTool = deleteEventTypeTool
export const calcomDeleteScheduleTool = deleteScheduleTool
export const calcomGetBookingTool = getBookingTool
export const calcomGetDefaultScheduleTool = getDefaultScheduleTool
export const calcomGetEventTypeTool = getEventTypeTool
export const calcomGetScheduleTool = getScheduleTool
export const calcomGetSlotsTool = getSlotsTool
export const calcomListBookingsTool = listBookingsTool
export const calcomListEventTypesTool = listEventTypesTool
export const calcomListSchedulesTool = listSchedulesTool
export const calcomRescheduleBookingTool = rescheduleBookingTool
export const calcomUpdateEventTypeTool = updateEventTypeTool
export const calcomUpdateScheduleTool = updateScheduleTool
