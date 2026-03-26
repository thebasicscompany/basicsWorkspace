export function useMcpServers() { return { data: [], isLoading: false } }
export function useStoredMcpTools(_serverId?: string) { return { data: [], isLoading: false } }
export function useForceRefreshMcpTools() { return { mutate: () => {}, isPending: false } }
export function useMcpToolsEvents() { return { data: [], isLoading: false } }
