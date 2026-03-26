export interface StoredTool { id: string; name: string; type: string; params: Record<string, any>; outputs: Record<string, any>; provider?: string; serviceId?: string }
export interface ToolCategory { id: string; name: string; tools: StoredTool[] }
export type ToolType = 'api' | 'custom' | 'mcp' | 'workflow'
