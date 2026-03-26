export interface CustomTool { id: string; name: string; title: string; schema: any; code?: string }
export function useCustomTools(_workspaceId?: string) { return { data: [] as CustomTool[], isLoading: false } }
export function getCustomTool(_id: string, _orgId?: string): CustomTool | null { return null }
