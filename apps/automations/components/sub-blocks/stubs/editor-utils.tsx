/**
 * Stub for editor utility functions from Sim's panel editor.
 */
export function getWorkspaceId(): string | undefined {
  return undefined
}

/**
 * Restores cursor position after text insertion in a code editor.
 */
export function restoreCursorAfterInsertion(
  element: HTMLTextAreaElement | null,
  newCursorPositionOrValue?: number | string,
  insertionStart?: number,
  insertionLength?: number
): void {
  if (!element) return
  const newCursor = typeof newCursorPositionOrValue === 'number'
    ? newCursorPositionOrValue
    : (insertionStart ?? 0) + (insertionLength ?? 0)
  requestAnimationFrame(() => {
    element.selectionStart = newCursor
    element.selectionEnd = newCursor
  })
}
