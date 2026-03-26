// WordPress tools exports
import { createCategoryTool } from '@/lib/sim/tools/wordpress/create_category'
import { createCommentTool } from '@/lib/sim/tools/wordpress/create_comment'
import { createPageTool } from '@/lib/sim/tools/wordpress/create_page'
import { createPostTool } from '@/lib/sim/tools/wordpress/create_post'
import { createTagTool } from '@/lib/sim/tools/wordpress/create_tag'
import { deleteCommentTool } from '@/lib/sim/tools/wordpress/delete_comment'
import { deleteMediaTool } from '@/lib/sim/tools/wordpress/delete_media'
import { deletePageTool } from '@/lib/sim/tools/wordpress/delete_page'
import { deletePostTool } from '@/lib/sim/tools/wordpress/delete_post'
import { getCurrentUserTool } from '@/lib/sim/tools/wordpress/get_current_user'
import { getMediaTool } from '@/lib/sim/tools/wordpress/get_media'
import { getPageTool } from '@/lib/sim/tools/wordpress/get_page'
import { getPostTool } from '@/lib/sim/tools/wordpress/get_post'
import { getUserTool } from '@/lib/sim/tools/wordpress/get_user'
import { listCategoriesTool } from '@/lib/sim/tools/wordpress/list_categories'
import { listCommentsTool } from '@/lib/sim/tools/wordpress/list_comments'
import { listMediaTool } from '@/lib/sim/tools/wordpress/list_media'
import { listPagesTool } from '@/lib/sim/tools/wordpress/list_pages'
import { listPostsTool } from '@/lib/sim/tools/wordpress/list_posts'
import { listTagsTool } from '@/lib/sim/tools/wordpress/list_tags'
import { listUsersTool } from '@/lib/sim/tools/wordpress/list_users'
import { searchContentTool } from '@/lib/sim/tools/wordpress/search_content'
import { updateCommentTool } from '@/lib/sim/tools/wordpress/update_comment'
import { updatePageTool } from '@/lib/sim/tools/wordpress/update_page'
import { updatePostTool } from '@/lib/sim/tools/wordpress/update_post'
import { uploadMediaTool } from '@/lib/sim/tools/wordpress/upload_media'

// Post operations
export const wordpressCreatePostTool = createPostTool
export const wordpressUpdatePostTool = updatePostTool
export const wordpressDeletePostTool = deletePostTool
export const wordpressGetPostTool = getPostTool
export const wordpressListPostsTool = listPostsTool

// Page operations
export const wordpressCreatePageTool = createPageTool
export const wordpressUpdatePageTool = updatePageTool
export const wordpressDeletePageTool = deletePageTool
export const wordpressGetPageTool = getPageTool
export const wordpressListPagesTool = listPagesTool

// Media operations
export const wordpressUploadMediaTool = uploadMediaTool
export const wordpressGetMediaTool = getMediaTool
export const wordpressListMediaTool = listMediaTool
export const wordpressDeleteMediaTool = deleteMediaTool

// Comment operations
export const wordpressCreateCommentTool = createCommentTool
export const wordpressListCommentsTool = listCommentsTool
export const wordpressUpdateCommentTool = updateCommentTool
export const wordpressDeleteCommentTool = deleteCommentTool

// Category operations
export const wordpressCreateCategoryTool = createCategoryTool
export const wordpressListCategoriesTool = listCategoriesTool

// Tag operations
export const wordpressCreateTagTool = createTagTool
export const wordpressListTagsTool = listTagsTool

// User operations
export const wordpressGetCurrentUserTool = getCurrentUserTool
export const wordpressListUsersTool = listUsersTool
export const wordpressGetUserTool = getUserTool

// Search operations
export const wordpressSearchContentTool = searchContentTool
