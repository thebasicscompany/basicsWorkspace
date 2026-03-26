import { crawlTool } from '@/lib/sim/tools/tavily/crawl'
import { extractTool } from '@/lib/sim/tools/tavily/extract'
import { mapTool } from '@/lib/sim/tools/tavily/map'
import { searchTool } from '@/lib/sim/tools/tavily/search'

export const tavilyExtractTool = extractTool
export const tavilySearchTool = searchTool
export const tavilyCrawlTool = crawlTool
export const tavilyMapTool = mapTool
