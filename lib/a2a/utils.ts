// Phase 4 stub — A2A (Agent-to-Agent) protocol utilities
// Will provide client creation and message helpers for the A2A protocol

/**
 * Create an A2A protocol client for communicating with a remote agent.
 * Phase 4 stub: throws since A2A infrastructure is not yet deployed.
 */
export async function createA2AClient(
  agentUrl: string,
  _apiKey?: string
): Promise<any> {
  throw new Error(
    `A2A client not implemented (Phase 4). Attempted to connect to: ${agentUrl}`
  )
}

/**
 * Extract text content from an A2A Message or Task.
 * Handles both Message (parts array) and legacy task artifacts.
 */
export function extractTextContent(messageOrTask: any): string {
  if (!messageOrTask) return ''

  // Handle Message objects (have parts directly)
  if (messageOrTask.parts) {
    const texts: string[] = []
    for (const part of messageOrTask.parts) {
      if (part.kind === 'text' && 'text' in part) {
        texts.push(part.text)
      }
    }
    return texts.join('\n')
  }

  // Handle Task objects (have artifacts)
  if (messageOrTask.artifacts) {
    const texts: string[] = []
    for (const artifact of messageOrTask.artifacts) {
      for (const part of artifact.parts ?? []) {
        if (part.kind === 'text' && 'text' in part) {
          texts.push((part as any).text)
        }
      }
    }
    return texts.join('\n')
  }

  return ''
}

/**
 * Check if a task state string is terminal (completed, failed, canceled).
 */
export function isTerminalState(state: string | null | undefined): boolean {
  if (!state) return false
  const terminalStates = ['completed', 'failed', 'canceled']
  return terminalStates.includes(state)
}
