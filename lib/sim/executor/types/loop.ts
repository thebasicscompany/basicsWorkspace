import type { SerializedLoop } from '@/lib/sim/serializer/types'

export interface LoopConfigWithNodes extends SerializedLoop {
  nodes: string[]
}

export function isLoopConfigWithNodes(config: SerializedLoop): config is LoopConfigWithNodes {
  return Array.isArray((config as any).nodes)
}
