export interface ToolParameterConfig { id: string; type: string; label: string; required?: boolean; description?: string }
export interface SubBlocksForToolInput { subBlocks: any[]; conditions: any[] }
export function formatParameterLabel(label: string): string { return label }
export function getSubBlocksForToolInput(_toolId: string, _params: any): SubBlocksForToolInput { return { subBlocks: [], conditions: [] } }
export function getToolParametersConfig(_toolId: string): ToolParameterConfig[] { return [] }
export function isPasswordParameter(_paramId: string): boolean { return false }

export function filterSchemaForLLM(schema: any, _userParams?: any): any { return schema }

