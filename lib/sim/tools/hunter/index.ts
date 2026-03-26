import { companiesFindTool } from '@/lib/sim/tools/hunter/companies_find'
import { discoverTool } from '@/lib/sim/tools/hunter/discover'
import { domainSearchTool } from '@/lib/sim/tools/hunter/domain_search'
import { emailCountTool } from '@/lib/sim/tools/hunter/email_count'
import { emailFinderTool } from '@/lib/sim/tools/hunter/email_finder'
import { emailVerifierTool } from '@/lib/sim/tools/hunter/email_verifier'

export const hunterDiscoverTool = discoverTool
export const hunterDomainSearchTool = domainSearchTool
export const hunterEmailFinderTool = emailFinderTool
export const hunterEmailVerifierTool = emailVerifierTool
export const hunterCompaniesFindTool = companiesFindTool
export const hunterEmailCountTool = emailCountTool
