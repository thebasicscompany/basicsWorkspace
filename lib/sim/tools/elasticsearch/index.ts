// Elasticsearch tools exports
import { bulkTool } from '@/lib/sim/tools/elasticsearch/bulk'
import { clusterHealthTool } from '@/lib/sim/tools/elasticsearch/cluster_health'
import { clusterStatsTool } from '@/lib/sim/tools/elasticsearch/cluster_stats'
import { countTool } from '@/lib/sim/tools/elasticsearch/count'
import { createIndexTool } from '@/lib/sim/tools/elasticsearch/create_index'
import { deleteDocumentTool } from '@/lib/sim/tools/elasticsearch/delete_document'
import { deleteIndexTool } from '@/lib/sim/tools/elasticsearch/delete_index'
import { getDocumentTool } from '@/lib/sim/tools/elasticsearch/get_document'
import { getIndexTool } from '@/lib/sim/tools/elasticsearch/get_index'
import { indexDocumentTool } from '@/lib/sim/tools/elasticsearch/index_document'
import { listIndicesTool } from '@/lib/sim/tools/elasticsearch/list_indices'
import { searchTool } from '@/lib/sim/tools/elasticsearch/search'
import { updateDocumentTool } from '@/lib/sim/tools/elasticsearch/update_document'

// Export individual tools with elasticsearch prefix
export const elasticsearchSearchTool = searchTool
export const elasticsearchIndexDocumentTool = indexDocumentTool
export const elasticsearchGetDocumentTool = getDocumentTool
export const elasticsearchUpdateDocumentTool = updateDocumentTool
export const elasticsearchDeleteDocumentTool = deleteDocumentTool
export const elasticsearchBulkTool = bulkTool
export const elasticsearchCountTool = countTool
export const elasticsearchCreateIndexTool = createIndexTool
export const elasticsearchDeleteIndexTool = deleteIndexTool
export const elasticsearchGetIndexTool = getIndexTool
export const elasticsearchListIndicesTool = listIndicesTool
export const elasticsearchClusterHealthTool = clusterHealthTool
export const elasticsearchClusterStatsTool = clusterStatsTool
