/** Undo/Redo operation types (from Sim's socket/constants.ts) */
export const UNDO_REDO_OPERATIONS = {
  BATCH_ADD_BLOCKS: 'batch-add-blocks',
  BATCH_REMOVE_BLOCKS: 'batch-remove-blocks',
  BATCH_ADD_EDGES: 'batch-add-edges',
  BATCH_REMOVE_EDGES: 'batch-remove-edges',
  BATCH_MOVE_BLOCKS: 'batch-move-blocks',
  UPDATE_PARENT: 'update-parent',
  BATCH_UPDATE_PARENT: 'batch-update-parent',
  BATCH_TOGGLE_ENABLED: 'batch-toggle-enabled',
  BATCH_TOGGLE_HANDLES: 'batch-toggle-handles',
  BATCH_TOGGLE_LOCKED: 'batch-toggle-locked',
  APPLY_DIFF: 'apply-diff',
  ACCEPT_DIFF: 'accept-diff',
  REJECT_DIFF: 'reject-diff',
} as const

export type UndoRedoOperation = (typeof UNDO_REDO_OPERATIONS)[keyof typeof UNDO_REDO_OPERATIONS]
