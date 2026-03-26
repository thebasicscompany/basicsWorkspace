// Phase 4 stub — MCP tool ID helpers
export const MCP_TOOL_ID_SEPARATOR = ':'

export function createMcpToolId(serverId: string, toolName: string): string {
  return `${serverId}${MCP_TOOL_ID_SEPARATOR}${toolName}`
}

export function parseMcpToolId(toolId: string): { serverId: string; toolName: string } {
  const idx = toolId.indexOf(MCP_TOOL_ID_SEPARATOR)
  if (idx === -1) return { serverId: toolId, toolName: '' }
  return { serverId: toolId.slice(0, idx), toolName: toolId.slice(idx + 1) }
}
