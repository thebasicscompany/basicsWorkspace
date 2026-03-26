import {
  getAllBlocks,
  getAllBlockTypes,
  getBlock,
  getBlockByToolName,
  getBlocksByCategory,
  isValidBlockType,
  registry,
} from '@/lib/sim/blocks/registry'

export {
  registry,
  getBlock,
  getBlockByToolName,
  getBlocksByCategory,
  getAllBlockTypes,
  isValidBlockType,
  getAllBlocks,
}

export type { BlockConfig } from '@/lib/sim/blocks/types'
