import { backlinksTool } from '@/lib/sim/tools/ahrefs/backlinks'
import { backlinksStatsTool } from '@/lib/sim/tools/ahrefs/backlinks_stats'
import { brokenBacklinksTool } from '@/lib/sim/tools/ahrefs/broken_backlinks'
import { domainRatingTool } from '@/lib/sim/tools/ahrefs/domain_rating'
import { keywordOverviewTool } from '@/lib/sim/tools/ahrefs/keyword_overview'
import { organicKeywordsTool } from '@/lib/sim/tools/ahrefs/organic_keywords'
import { referringDomainsTool } from '@/lib/sim/tools/ahrefs/referring_domains'
import { topPagesTool } from '@/lib/sim/tools/ahrefs/top_pages'

export const ahrefsDomainRatingTool = domainRatingTool
export const ahrefsBacklinksTool = backlinksTool
export const ahrefsBacklinksStatsTool = backlinksStatsTool
export const ahrefsReferringDomainsTool = referringDomainsTool
export const ahrefsOrganicKeywordsTool = organicKeywordsTool
export const ahrefsTopPagesTool = topPagesTool
export const ahrefsKeywordOverviewTool = keywordOverviewTool
export const ahrefsBrokenBacklinksTool = brokenBacklinksTool
