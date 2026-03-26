import { addImageTool } from '@/lib/sim/tools/google_slides/add_image'
import { addSlideTool } from '@/lib/sim/tools/google_slides/add_slide'
import { createTool } from '@/lib/sim/tools/google_slides/create'
import { createShapeTool } from '@/lib/sim/tools/google_slides/create_shape'
import { createTableTool } from '@/lib/sim/tools/google_slides/create_table'
import { deleteObjectTool } from '@/lib/sim/tools/google_slides/delete_object'
import { duplicateObjectTool } from '@/lib/sim/tools/google_slides/duplicate_object'
import { getPageTool } from '@/lib/sim/tools/google_slides/get_page'
import { getThumbnailTool } from '@/lib/sim/tools/google_slides/get_thumbnail'
import { insertTextTool } from '@/lib/sim/tools/google_slides/insert_text'
import { readTool } from '@/lib/sim/tools/google_slides/read'
import { replaceAllTextTool } from '@/lib/sim/tools/google_slides/replace_all_text'
import { updateSlidesPositionTool } from '@/lib/sim/tools/google_slides/update_slides_position'
import { writeTool } from '@/lib/sim/tools/google_slides/write'

export const googleSlidesReadTool = readTool
export const googleSlidesWriteTool = writeTool
export const googleSlidesCreateTool = createTool
export const googleSlidesReplaceAllTextTool = replaceAllTextTool
export const googleSlidesAddSlideTool = addSlideTool
export const googleSlidesGetThumbnailTool = getThumbnailTool
export const googleSlidesAddImageTool = addImageTool
export const googleSlidesGetPageTool = getPageTool
export const googleSlidesDeleteObjectTool = deleteObjectTool
export const googleSlidesDuplicateObjectTool = duplicateObjectTool
export const googleSlidesUpdateSlidesPositionTool = updateSlidesPositionTool
export const googleSlidesCreateTableTool = createTableTool
export const googleSlidesCreateShapeTool = createShapeTool
export const googleSlidesInsertTextTool = insertTextTool
