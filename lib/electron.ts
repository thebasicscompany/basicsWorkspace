/**
 * Renderer-side check for whether the app is running inside Electron.
 */
export const isElectron: boolean =
  typeof window !== "undefined" &&
  !!(window as unknown as Record<string, unknown>).electronAPI
