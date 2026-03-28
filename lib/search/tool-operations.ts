/**
 * Tool operations search index — stub.
 * Will be populated when the MCP/tool discovery system is built.
 */
export interface ToolOperationEntry {
  id: string
  operationName: string
  operationId?: string
  serviceName: string
  description?: string
  blockType: string
  category?: string
  aliases?: string[]
  icon?: any
  bgColor?: string
}

export function getToolOperationsIndex(): ToolOperationEntry[] {
  return []
}
