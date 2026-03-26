import { fetchPointsTool } from '@/lib/sim/tools/qdrant/fetch_points'
import { searchVectorTool } from '@/lib/sim/tools/qdrant/search_vector'
import { upsertPointsTool } from '@/lib/sim/tools/qdrant/upsert_points'

export const qdrantUpsertTool = upsertPointsTool
export const qdrantSearchTool = searchVectorTool
export const qdrantFetchTool = fetchPointsTool
