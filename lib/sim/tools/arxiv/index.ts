import { getAuthorPapersTool } from '@/lib/sim/tools/arxiv/get_author_papers'
import { getPaperTool } from '@/lib/sim/tools/arxiv/get_paper'
import { searchTool } from '@/lib/sim/tools/arxiv/search'

export const arxivSearchTool = searchTool
export const arxivGetPaperTool = getPaperTool
export const arxivGetAuthorPapersTool = getAuthorPapersTool
