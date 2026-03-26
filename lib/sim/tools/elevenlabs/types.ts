import type { UserFile } from '@/lib/sim/executor/types'
import type { ToolResponse } from '@/lib/sim/tools/types'

export interface ElevenLabsTtsParams {
  apiKey: string
  text: string
  voiceId: string
  modelId?: string
  stability?: number
  similarity?: number
}

export interface ElevenLabsTtsResponse extends ToolResponse {
  output: {
    audioUrl: string
    audioFile?: UserFile
  }
}

export interface ElevenLabsBlockResponse extends ToolResponse {
  output: {
    audioUrl: string
    audioFile?: UserFile
  }
}
