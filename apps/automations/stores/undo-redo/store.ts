import type { Edge } from 'reactflow'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { UNDO_REDO_OPERATIONS } from './constants'
import type {
  BatchAddBlocksOperation,
  BatchAddEdgesOperation,
  BatchMoveBlocksOperation,
  BatchRemoveBlocksOperation,
  BatchRemoveEdgesOperation,
  BatchUpdateParentOperation,
  Operation,
  OperationEntry,
  UndoRedoState,
} from './types'
import type { BlockState } from '@/apps/automations/stores/workflow-types'

const DEFAULT_CAPACITY = 100
const MAX_STACKS = 5

let recordingSuspendDepth = 0

function isRecordingSuspended(): boolean {
  return recordingSuspendDepth > 0
}

/**
 * Temporarily suspends undo/redo recording while the provided callback runs.
 */
export async function runWithUndoRedoRecordingSuspended<T>(
  callback: () => Promise<T> | T
): Promise<T> {
  recordingSuspendDepth += 1
  try {
    return await Promise.resolve(callback())
  } finally {
    recordingSuspendDepth = Math.max(0, recordingSuspendDepth - 1)
  }
}

function getStackKey(workflowId: string, userId: string): string {
  return `${workflowId}:${userId}`
}

const safeStorageAdapter = {
  getItem: (name: string): string | null => {
    if (typeof localStorage === 'undefined') return null
    try {
      return localStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem: (name: string, value: string): void => {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(name, value)
    } catch {
      // Handles QuotaExceededError gracefully
    }
  },
  removeItem: (name: string): void => {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.removeItem(name)
    } catch {
      // ignore
    }
  },
}

function isOperationApplicable(
  operation: Operation,
  graph: { blocksById: Record<string, BlockState>; edgesById: Record<string, Edge> }
): boolean {
  switch (operation.type) {
    case UNDO_REDO_OPERATIONS.BATCH_REMOVE_BLOCKS: {
      const op = operation as BatchRemoveBlocksOperation
      return op.data.blockSnapshots.every((block) => Boolean(graph.blocksById[block.id]))
    }
    case UNDO_REDO_OPERATIONS.BATCH_ADD_BLOCKS: {
      const op = operation as BatchAddBlocksOperation
      return op.data.blockSnapshots.every((block) => !graph.blocksById[block.id])
    }
    case UNDO_REDO_OPERATIONS.BATCH_MOVE_BLOCKS: {
      const op = operation as BatchMoveBlocksOperation
      return op.data.moves.every((move) => Boolean(graph.blocksById[move.blockId]))
    }
    case UNDO_REDO_OPERATIONS.UPDATE_PARENT: {
      const blockId = operation.data.blockId
      return Boolean(graph.blocksById[blockId])
    }
    case UNDO_REDO_OPERATIONS.BATCH_UPDATE_PARENT: {
      const op = operation as BatchUpdateParentOperation
      return op.data.updates.every((u) => Boolean(graph.blocksById[u.blockId]))
    }
    case UNDO_REDO_OPERATIONS.BATCH_REMOVE_EDGES: {
      const op = operation as BatchRemoveEdgesOperation
      return op.data.edgeSnapshots.every((edge) => Boolean(graph.edgesById[edge.id]))
    }
    case UNDO_REDO_OPERATIONS.BATCH_ADD_EDGES: {
      const op = operation as BatchAddEdgesOperation
      return op.data.edgeSnapshots.every((edge) => !graph.edgesById[edge.id])
    }
    default:
      return true
  }
}

export const useUndoRedoStore = create<UndoRedoState>()(
  persist(
    (set, get) => ({
      stacks: {},
      capacity: DEFAULT_CAPACITY,

      push: (workflowId: string, userId: string, entry: OperationEntry) => {
        if (isRecordingSuspended()) return

        const key = getStackKey(workflowId, userId)
        const state = get()
        const currentStacks = { ...state.stacks }

        const stackKeys = Object.keys(currentStacks)
        if (stackKeys.length >= MAX_STACKS && !currentStacks[key]) {
          let oldestKey: string | null = null
          let oldestTime = Number.POSITIVE_INFINITY
          for (const k of stackKeys) {
            const t = currentStacks[k].lastUpdated ?? 0
            if (t < oldestTime) {
              oldestTime = t
              oldestKey = k
            }
          }
          if (oldestKey) delete currentStacks[oldestKey]
        }

        const stack = currentStacks[key] || { undo: [], redo: [] }

        // Prevent duplicate diff operations
        if (['apply-diff', 'accept-diff', 'reject-diff'].includes(entry.operation.type)) {
          const lastEntry = stack.undo[stack.undo.length - 1]
          if (lastEntry && lastEntry.operation.type === entry.operation.type) {
            const lastData = lastEntry.operation.data as any
            const newData = entry.operation.data as any
            let isDuplicate = false
            if (entry.operation.type === 'apply-diff') {
              isDuplicate =
                JSON.stringify(lastData.baselineSnapshot?.blocks) ===
                  JSON.stringify(newData.baselineSnapshot?.blocks) &&
                JSON.stringify(lastData.proposedState?.blocks) ===
                  JSON.stringify(newData.proposedState?.blocks)
            } else if (entry.operation.type === 'accept-diff') {
              isDuplicate =
                JSON.stringify(lastData.afterAccept?.blocks) ===
                JSON.stringify(newData.afterAccept?.blocks)
            } else if (entry.operation.type === 'reject-diff') {
              isDuplicate =
                JSON.stringify(lastData.afterReject?.blocks) ===
                JSON.stringify(newData.afterReject?.blocks)
            }
            if (isDuplicate) return
          }
        }

        // Coalesce consecutive batch-move-blocks
        if (entry.operation.type === 'batch-move-blocks') {
          const incoming = entry.operation as BatchMoveBlocksOperation
          const last = stack.undo[stack.undo.length - 1]

          const allNoOp = incoming.data.moves.every((move) => {
            const sameParent = (move.before.parentId ?? null) === (move.after.parentId ?? null)
            return move.before.x === move.after.x && move.before.y === move.after.y && sameParent
          })
          if (allNoOp) return

          if (
            last &&
            last.operation.type === 'batch-move-blocks' &&
            last.inverse.type === 'batch-move-blocks'
          ) {
            const prev = last.operation as BatchMoveBlocksOperation
            const prevBlockIds = new Set(prev.data.moves.map((m) => m.blockId))
            const incomingBlockIds = new Set(incoming.data.moves.map((m) => m.blockId))

            const sameBlocks =
              prevBlockIds.size === incomingBlockIds.size &&
              [...prevBlockIds].every((id) => incomingBlockIds.has(id))

            if (sameBlocks) {
              const mergedMoves = incoming.data.moves.map((incomingMove) => {
                const prevMove = prev.data.moves.find((m) => m.blockId === incomingMove.blockId)!
                return {
                  blockId: incomingMove.blockId,
                  before: prevMove.before,
                  after: incomingMove.after,
                }
              })

              const allSameAfter = mergedMoves.every((move) => {
                const sameParent = (move.before.parentId ?? null) === (move.after.parentId ?? null)
                return move.before.x === move.after.x && move.before.y === move.after.y && sameParent
              })

              const newUndoCoalesced: OperationEntry[] = allSameAfter
                ? stack.undo.slice(0, -1)
                : (() => {
                    const op = entry.operation as BatchMoveBlocksOperation
                    const inv = entry.inverse as BatchMoveBlocksOperation
                    const newEntry: OperationEntry = {
                      id: entry.id,
                      createdAt: entry.createdAt,
                      operation: {
                        id: op.id,
                        type: 'batch-move-blocks',
                        timestamp: op.timestamp,
                        workflowId,
                        userId,
                        data: { moves: mergedMoves },
                      },
                      inverse: {
                        id: inv.id,
                        type: 'batch-move-blocks',
                        timestamp: inv.timestamp,
                        workflowId,
                        userId,
                        data: {
                          moves: mergedMoves.map((m) => ({
                            blockId: m.blockId,
                            before: m.after,
                            after: m.before,
                          })),
                        },
                      },
                    }
                    return [...stack.undo.slice(0, -1), newEntry]
                  })()

              currentStacks[key] = { undo: newUndoCoalesced, redo: [], lastUpdated: Date.now() }
              set({ stacks: currentStacks })
              return
            }
          }
        }

        const newUndo = [...stack.undo, entry]
        if (newUndo.length > state.capacity) newUndo.shift()

        currentStacks[key] = { undo: newUndo, redo: [], lastUpdated: Date.now() }
        set({ stacks: currentStacks })
      },

      undo: (workflowId: string, userId: string) => {
        const key = getStackKey(workflowId, userId)
        const state = get()
        const stack = state.stacks[key]
        if (!stack || stack.undo.length === 0) return null

        const entry = stack.undo[stack.undo.length - 1]
        const newUndo = stack.undo.slice(0, -1)
        const newRedo = [...stack.redo, entry]
        if (newRedo.length > state.capacity) newRedo.shift()

        set({
          stacks: {
            ...state.stacks,
            [key]: { undo: newUndo, redo: newRedo, lastUpdated: Date.now() },
          },
        })

        return entry
      },

      redo: (workflowId: string, userId: string) => {
        const key = getStackKey(workflowId, userId)
        const state = get()
        const stack = state.stacks[key]
        if (!stack || stack.redo.length === 0) return null

        const entry = stack.redo[stack.redo.length - 1]
        const newRedo = stack.redo.slice(0, -1)
        const newUndo = [...stack.undo, entry]
        if (newUndo.length > state.capacity) newUndo.shift()

        set({
          stacks: {
            ...state.stacks,
            [key]: { undo: newUndo, redo: newRedo, lastUpdated: Date.now() },
          },
        })

        return entry
      },

      clear: (workflowId: string, userId: string) => {
        const key = getStackKey(workflowId, userId)
        const state = get()
        const { [key]: _, ...rest } = state.stacks
        set({ stacks: rest })
      },

      clearRedo: (workflowId: string, userId: string) => {
        const key = getStackKey(workflowId, userId)
        const state = get()
        const stack = state.stacks[key]
        if (!stack) return
        set({
          stacks: { ...state.stacks, [key]: { ...stack, redo: [] } },
        })
      },

      getStackSizes: (workflowId: string, userId: string) => {
        const key = getStackKey(workflowId, userId)
        const stack = get().stacks[key]
        if (!stack) return { undoSize: 0, redoSize: 0 }
        return { undoSize: stack.undo.length, redoSize: stack.redo.length }
      },

      setCapacity: (capacity: number) => {
        const state = get()
        const newStacks: typeof state.stacks = {}
        for (const [key, stack] of Object.entries(state.stacks)) {
          newStacks[key] = {
            undo: stack.undo.slice(-capacity),
            redo: stack.redo.slice(-capacity),
            lastUpdated: stack.lastUpdated,
          }
        }
        set({ capacity, stacks: newStacks })
      },

      pruneInvalidEntries: (workflowId, userId, graph) => {
        const key = getStackKey(workflowId, userId)
        const state = get()
        const stack = state.stacks[key]
        if (!stack) return

        const validUndo = stack.undo.filter((entry) => isOperationApplicable(entry.inverse, graph))
        const validRedo = stack.redo.filter((entry) => isOperationApplicable(entry.operation, graph))

        const prunedUndoCount = stack.undo.length - validUndo.length
        const prunedRedoCount = stack.redo.length - validRedo.length

        if (prunedUndoCount > 0 || prunedRedoCount > 0) {
          set({
            stacks: {
              ...state.stacks,
              [key]: { ...stack, undo: validUndo, redo: validRedo },
            },
          })
        }
      },
    }),
    {
      name: 'workflow-undo-redo',
      storage: createJSONStorage(() => safeStorageAdapter),
      partialize: (state) => ({
        stacks: state.stacks,
        capacity: state.capacity,
      }),
    }
  )
)
