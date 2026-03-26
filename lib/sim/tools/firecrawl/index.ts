import { agentTool } from '@/lib/sim/tools/firecrawl/agent'
import { crawlTool } from '@/lib/sim/tools/firecrawl/crawl'
import { extractTool } from '@/lib/sim/tools/firecrawl/extract'
import { mapTool } from '@/lib/sim/tools/firecrawl/map'
import { scrapeTool } from '@/lib/sim/tools/firecrawl/scrape'
import { searchTool } from '@/lib/sim/tools/firecrawl/search'

export const firecrawlScrapeTool = scrapeTool
export const firecrawlSearchTool = searchTool
export const firecrawlCrawlTool = crawlTool
export const firecrawlMapTool = mapTool
export const firecrawlExtractTool = extractTool
export const firecrawlAgentTool = agentTool
