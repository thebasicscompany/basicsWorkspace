import { confluenceAddLabelTool } from '@/lib/sim/tools/confluence/add_label'
import { confluenceCreateBlogPostTool } from '@/lib/sim/tools/confluence/create_blogpost'
import { confluenceCreateCommentTool } from '@/lib/sim/tools/confluence/create_comment'
import { confluenceCreatePageTool } from '@/lib/sim/tools/confluence/create_page'
import { confluenceCreatePagePropertyTool } from '@/lib/sim/tools/confluence/create_page_property'
import { confluenceCreateSpaceTool } from '@/lib/sim/tools/confluence/create_space'
import { confluenceCreateSpacePropertyTool } from '@/lib/sim/tools/confluence/create_space_property'
import { confluenceDeleteAttachmentTool } from '@/lib/sim/tools/confluence/delete_attachment'
import { confluenceDeleteBlogPostTool } from '@/lib/sim/tools/confluence/delete_blogpost'
import { confluenceDeleteCommentTool } from '@/lib/sim/tools/confluence/delete_comment'
import { confluenceDeleteLabelTool } from '@/lib/sim/tools/confluence/delete_label'
import { confluenceDeletePageTool } from '@/lib/sim/tools/confluence/delete_page'
import { confluenceDeletePagePropertyTool } from '@/lib/sim/tools/confluence/delete_page_property'
import { confluenceDeleteSpaceTool } from '@/lib/sim/tools/confluence/delete_space'
import { confluenceDeleteSpacePropertyTool } from '@/lib/sim/tools/confluence/delete_space_property'
import { confluenceGetBlogPostTool } from '@/lib/sim/tools/confluence/get_blogpost'
import { confluenceGetPageAncestorsTool } from '@/lib/sim/tools/confluence/get_page_ancestors'
import { confluenceGetPageChildrenTool } from '@/lib/sim/tools/confluence/get_page_children'
import { confluenceGetPageDescendantsTool } from '@/lib/sim/tools/confluence/get_page_descendants'
import { confluenceGetPageVersionTool } from '@/lib/sim/tools/confluence/get_page_version'
import { confluenceGetPagesByLabelTool } from '@/lib/sim/tools/confluence/get_pages_by_label'
import { confluenceGetSpaceTool } from '@/lib/sim/tools/confluence/get_space'
import { confluenceGetTaskTool } from '@/lib/sim/tools/confluence/get_task'
import { confluenceGetUserTool } from '@/lib/sim/tools/confluence/get_user'
import { confluenceListAttachmentsTool } from '@/lib/sim/tools/confluence/list_attachments'
import { confluenceListBlogPostsTool } from '@/lib/sim/tools/confluence/list_blogposts'
import { confluenceListBlogPostsInSpaceTool } from '@/lib/sim/tools/confluence/list_blogposts_in_space'
import { confluenceListCommentsTool } from '@/lib/sim/tools/confluence/list_comments'
import { confluenceListLabelsTool } from '@/lib/sim/tools/confluence/list_labels'
import { confluenceListPagePropertiesTool } from '@/lib/sim/tools/confluence/list_page_properties'
import { confluenceListPageVersionsTool } from '@/lib/sim/tools/confluence/list_page_versions'
import { confluenceListPagesInSpaceTool } from '@/lib/sim/tools/confluence/list_pages_in_space'
import { confluenceListSpaceLabelsTool } from '@/lib/sim/tools/confluence/list_space_labels'
import { confluenceListSpacePermissionsTool } from '@/lib/sim/tools/confluence/list_space_permissions'
import { confluenceListSpacePropertiesTool } from '@/lib/sim/tools/confluence/list_space_properties'
import { confluenceListSpacesTool } from '@/lib/sim/tools/confluence/list_spaces'
import { confluenceListTasksTool } from '@/lib/sim/tools/confluence/list_tasks'
import { confluenceRetrieveTool } from '@/lib/sim/tools/confluence/retrieve'
import { confluenceSearchTool } from '@/lib/sim/tools/confluence/search'
import { confluenceSearchInSpaceTool } from '@/lib/sim/tools/confluence/search_in_space'
import {
  ATTACHMENT_ITEM_PROPERTIES,
  ATTACHMENT_OUTPUT,
  ATTACHMENTS_OUTPUT,
  BODY_FORMAT_PROPERTIES,
  COMMENT_BODY_OUTPUT_PROPERTIES,
  COMMENT_ITEM_PROPERTIES,
  COMMENT_OUTPUT,
  COMMENTS_OUTPUT,
  CONTENT_BODY_OUTPUT,
  CONTENT_BODY_OUTPUT_PROPERTIES,
  DELETED_OUTPUT,
  DETAILED_VERSION_OUTPUT,
  DETAILED_VERSION_OUTPUT_PROPERTIES,
  LABEL_ITEM_PROPERTIES,
  LABEL_OUTPUT,
  LABELS_OUTPUT,
  PAGE_ID_OUTPUT,
  PAGE_ITEM_PROPERTIES,
  PAGE_OUTPUT,
  PAGES_OUTPUT,
  PAGINATION_LINKS_PROPERTIES,
  SEARCH_RESULT_ITEM_PROPERTIES,
  SEARCH_RESULT_OUTPUT,
  SEARCH_RESULT_SPACE_PROPERTIES,
  SEARCH_RESULTS_OUTPUT,
  SPACE_DESCRIPTION_OUTPUT_PROPERTIES,
  SPACE_ITEM_PROPERTIES,
  SPACE_OUTPUT,
  SPACES_OUTPUT,
  SUCCESS_OUTPUT,
  TIMESTAMP_OUTPUT,
  URL_OUTPUT,
  VERSION_OUTPUT,
  VERSION_OUTPUT_PROPERTIES,
} from '@/lib/sim/tools/confluence/types'
import { confluenceUpdateTool } from '@/lib/sim/tools/confluence/update'
import { confluenceUpdateBlogPostTool } from '@/lib/sim/tools/confluence/update_blogpost'
import { confluenceUpdateCommentTool } from '@/lib/sim/tools/confluence/update_comment'
import { confluenceUpdateSpaceTool } from '@/lib/sim/tools/confluence/update_space'
import { confluenceUpdateTaskTool } from '@/lib/sim/tools/confluence/update_task'
import { confluenceUploadAttachmentTool } from '@/lib/sim/tools/confluence/upload_attachment'

export {
  // Page Tools
  confluenceRetrieveTool,
  confluenceUpdateTool,
  confluenceCreatePageTool,
  confluenceDeletePageTool,
  confluenceListPagesInSpaceTool,
  confluenceGetPageChildrenTool,
  confluenceGetPageAncestorsTool,
  confluenceGetPageDescendantsTool,
  // Page Version Tools
  confluenceListPageVersionsTool,
  confluenceGetPageVersionTool,
  // Page Properties Tools
  confluenceListPagePropertiesTool,
  confluenceCreatePagePropertyTool,
  confluenceDeletePagePropertyTool,
  // Blog Post Tools
  confluenceListBlogPostsTool,
  confluenceGetBlogPostTool,
  confluenceCreateBlogPostTool,
  confluenceUpdateBlogPostTool,
  confluenceDeleteBlogPostTool,
  confluenceListBlogPostsInSpaceTool,
  // Search Tools
  confluenceSearchTool,
  confluenceSearchInSpaceTool,
  // Comment Tools
  confluenceCreateCommentTool,
  confluenceListCommentsTool,
  confluenceUpdateCommentTool,
  confluenceDeleteCommentTool,
  // Attachment Tools
  confluenceListAttachmentsTool,
  confluenceDeleteAttachmentTool,
  confluenceUploadAttachmentTool,
  // Label Tools
  confluenceListLabelsTool,
  confluenceAddLabelTool,
  confluenceDeleteLabelTool,
  confluenceGetPagesByLabelTool,
  confluenceListSpaceLabelsTool,
  // User Tools
  confluenceGetUserTool,
  // Space Tools
  confluenceGetSpaceTool,
  confluenceCreateSpaceTool,
  confluenceUpdateSpaceTool,
  confluenceDeleteSpaceTool,
  confluenceListSpacesTool,
  // Space Property Tools
  confluenceListSpacePropertiesTool,
  confluenceCreateSpacePropertyTool,
  confluenceDeleteSpacePropertyTool,
  // Space Permission Tools
  confluenceListSpacePermissionsTool,
  // Task Tools
  confluenceListTasksTool,
  confluenceGetTaskTool,
  confluenceUpdateTaskTool,
  // Item property constants (for use in outputs)
  ATTACHMENT_ITEM_PROPERTIES,
  COMMENT_ITEM_PROPERTIES,
  LABEL_ITEM_PROPERTIES,
  PAGE_ITEM_PROPERTIES,
  SEARCH_RESULT_ITEM_PROPERTIES,
  SPACE_ITEM_PROPERTIES,
  VERSION_OUTPUT_PROPERTIES,
  DETAILED_VERSION_OUTPUT_PROPERTIES,
  COMMENT_BODY_OUTPUT_PROPERTIES,
  CONTENT_BODY_OUTPUT_PROPERTIES,
  BODY_FORMAT_PROPERTIES,
  SPACE_DESCRIPTION_OUTPUT_PROPERTIES,
  SEARCH_RESULT_SPACE_PROPERTIES,
  PAGINATION_LINKS_PROPERTIES,
  // Complete output definitions (for use in outputs)
  ATTACHMENT_OUTPUT,
  ATTACHMENTS_OUTPUT,
  COMMENT_OUTPUT,
  COMMENTS_OUTPUT,
  CONTENT_BODY_OUTPUT,
  DETAILED_VERSION_OUTPUT,
  LABEL_OUTPUT,
  LABELS_OUTPUT,
  PAGE_OUTPUT,
  PAGES_OUTPUT,
  SEARCH_RESULT_OUTPUT,
  SEARCH_RESULTS_OUTPUT,
  SPACE_OUTPUT,
  SPACES_OUTPUT,
  VERSION_OUTPUT,
  // Common output properties
  TIMESTAMP_OUTPUT,
  PAGE_ID_OUTPUT,
  SUCCESS_OUTPUT,
  DELETED_OUTPUT,
  URL_OUTPUT,
}
