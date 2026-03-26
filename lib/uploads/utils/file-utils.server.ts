// Phase 4 stub — server-side file utilities

export async function downloadFileFromStorage(
  _keyOrFile: unknown,
  _requestId?: string,
  _log?: unknown
): Promise<Buffer> {
  throw new Error('File downloads not yet implemented (Phase 4)')
}

/** Download a file from an HTTPS URL (Phase 4 stub) */
export async function downloadFileFromUrl(_url: string): Promise<Buffer> {
  throw new Error('File URL downloads not yet implemented (Phase 4)')
}

export async function uploadFileToStorage(
  _file: Buffer | string,
  _filename: string,
  _orgId: string
): Promise<{ url: string; key: string }> {
  throw new Error('File uploads not yet implemented (Phase 4)')
}

export async function getFileFromStorage(_key: string): Promise<Buffer> {
  throw new Error('File downloads not yet implemented (Phase 4)')
}

export async function deleteFileFromStorage(_key: string): Promise<void> {}
