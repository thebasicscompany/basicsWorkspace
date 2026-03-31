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

/**
 * Resolve an internal file URL to a directly-fetchable URL.
 * Phase 4 stub — returns the URL unchanged and no error.
 */
export async function resolveInternalFileUrl(
  fileUrl: string,
  _userId: string,
  _requestId?: string,
  _logger?: unknown
): Promise<{ fileUrl?: string; error?: { message: string; status: number } }> {
  // Phase 4 stub — internal file URLs are not yet supported,
  // pass through for external URLs.
  return { fileUrl }
}

/**
 * Resolve a file input (file object or filePath string) to a fetchable URL.
 * Phase 4 stub — returns the filePath if provided, errors otherwise.
 */
export async function resolveFileInputToUrl(options: {
  file?: unknown
  filePath?: string
  userId?: string
  requestId?: string
  logger?: unknown
}): Promise<{ fileUrl?: string; error?: { message: string; status: number } }> {
  if (options.filePath) {
    return { fileUrl: options.filePath }
  }
  if (options.file && typeof options.file === 'object' && options.file !== null) {
    const f = options.file as Record<string, unknown>
    if (typeof f.url === 'string') return { fileUrl: f.url }
    if (typeof f.path === 'string') return { fileUrl: f.path }
  }
  return { error: { message: 'No file input provided', status: 400 } }
}
