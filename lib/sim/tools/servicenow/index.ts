import { createRecordTool } from '@/lib/sim/tools/servicenow/create_record'
import { deleteRecordTool } from '@/lib/sim/tools/servicenow/delete_record'
import { readRecordTool } from '@/lib/sim/tools/servicenow/read_record'
import { updateRecordTool } from '@/lib/sim/tools/servicenow/update_record'

export {
  createRecordTool as servicenowCreateRecordTool,
  readRecordTool as servicenowReadRecordTool,
  updateRecordTool as servicenowUpdateRecordTool,
  deleteRecordTool as servicenowDeleteRecordTool,
}
