import type { ToolResponse } from '@/lib/sim/tools/types'

export interface ThinkingToolParams {
  thought: string
}

export interface ThinkingToolResponse extends ToolResponse {
  output: {
    acknowledgedThought: string
  }
}
