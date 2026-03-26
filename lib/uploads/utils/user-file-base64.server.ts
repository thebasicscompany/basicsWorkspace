// Phase 4 stub — base64 file encoding server utilities

export async function fileToBase64(_fileUrl: string): Promise<string> {
  throw new Error('File base64 encoding not yet implemented (Phase 4)')
}

export async function base64ToBuffer(base64: string): Promise<Buffer> {
  return Buffer.from(base64, 'base64')
}

/** Check if any value in a params object contains a UserFile with metadata */
export function containsUserFileWithMetadata(_params: Record<string, unknown>): boolean {
  return false
}

/** Replace UserFile references in params with base64-encoded data */
export async function hydrateUserFilesWithBase64(
  params: Record<string, unknown>,
  _ctxOrOrgId: string | Record<string, unknown>
): Promise<Record<string, unknown>> {
  return params
}
