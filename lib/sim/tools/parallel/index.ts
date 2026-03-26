import { deepResearchTool } from '@/lib/sim/tools/parallel/deep_research'
import { extractTool } from '@/lib/sim/tools/parallel/extract'
import { searchTool } from '@/lib/sim/tools/parallel/search'

export const parallelSearchTool = searchTool
export const parallelExtractTool = extractTool
export const parallelDeepResearchTool = deepResearchTool

export * from './types'
