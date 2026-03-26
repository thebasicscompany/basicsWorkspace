/**
 * Stub for useCodeUndoRedo.
 * The real implementation uses a separate undo/redo stack for code editors.
 */
export function useCodeUndoRedo(_opts?: any) {
  return {
    canUndo: false,
    canRedo: false,
    undo: (..._args: any[]) => {},
    redo: (..._args: any[]) => {},
    pushState: (..._args: any[]) => {},
    recordChange: (..._args: any[]) => {},
    recordReplace: (..._args: any[]) => {},
    flushPending: (..._args: any[]) => {},
    startSession: (..._args: any[]) => {},
  }
}
