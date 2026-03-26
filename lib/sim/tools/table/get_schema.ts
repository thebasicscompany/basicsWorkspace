import type { TableGetSchemaParams, TableGetSchemaResponse } from '@/lib/sim/tools/table/types'
import type { ToolConfig } from '@/lib/sim/tools/types'

export const tableGetSchemaTool: ToolConfig<TableGetSchemaParams, TableGetSchemaResponse> = {
  id: 'table_get_schema',
  name: 'Get Schema',
  description: 'Get the schema configuration of a table',
  version: '1.0.0',

  params: {
    tableId: {
      type: 'string',
      required: true,
      description: 'Table ID',
      visibility: 'user-only',
    },
  },

  request: {
    url: (params: TableGetSchemaParams) => {
      const orgId = params._context?.orgId
      if (!orgId) {
        throw new Error('Workspace ID is required in execution context')
      }

      return `/api/table/${params.tableId}?orgId=${encodeURIComponent(orgId)}`
    },
    method: 'GET',
    headers: () => ({
      'Content-Type': 'application/json',
    }),
  },

  transformResponse: async (response): Promise<TableGetSchemaResponse> => {
    const result = await response.json()
    const data = result.data || result

    return {
      success: true,
      output: {
        name: data.table.name,
        columns: data.table.schema.columns,
        message: data.message || 'Schema retrieved successfully',
      },
    }
  },

  outputs: {
    success: { type: 'boolean', description: 'Whether schema was retrieved' },
    name: { type: 'string', description: 'Table name' },
    columns: { type: 'array', description: 'Column definitions' },
    message: { type: 'string', description: 'Status message' },
  },
}
