// Phase 4 stub — shared file utilities

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? ''
}

export function getMimeType(filename: string): string {
  const ext = getFileExtension(filename)
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
  }
  return mimeTypes[ext] ?? 'application/octet-stream'
}

/** Get MIME type from file extension string */
export function getMimeTypeFromExtension(ext: string): string {
  return getMimeType(`file.${ext}`)
}

// RawFileInput — file input before upload processing
export interface RawFileInput {
  name: string
  type: string
  size: number
  data: Buffer | string
  url?: string
}

/** Check if a URL is an internally-hosted file URL (Phase 4 stub) */
export function isInternalFileUrl(_url: string): boolean {
  return false
}

/** Infer execution context (e.g. 'image', 'document') from a storage key */
export function inferContextFromKey(_key: string): string {
  return 'document'
}

/** Resolve a file input to a public HTTPS URL (Phase 4 stub) */
export async function resolveHttpsUrlFromFileInput(
  _fileInput: unknown,
  _orgId?: string
): Promise<string> {
  throw new Error('File URL resolution not yet implemented (Phase 4)')
}

/** Convert raw file inputs to UserFile objects for executor consumption */
export function processFilesToUserFiles(
  _files: unknown[],
  _orgIdOrRequestId?: string,
  _logOrOpts?: unknown
): unknown[] {
  return []
}

/** Convert a single raw file input to a UserFile object for executor consumption */
export function processSingleFileToUserFile(
  _file: unknown,
  _requestId?: string,
  _logger?: unknown
): { name: string; type: string; size: number; key?: string; base64?: string; url?: string } {
  throw new Error('Single file processing not yet implemented (Phase 4)')
}

/** Get file extension from a MIME type string */
export function getExtensionFromMimeType(mimeType: string): string | null {
  const map: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'text/plain': 'txt',
    'text/csv': 'csv',
    'text/html': 'html',
    'application/json': 'json',
    'application/xml': 'xml',
    'application/zip': 'zip',
    'application/gzip': 'gz',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/webm': 'webm',
    'audio/mp4': 'm4a',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/msword': 'doc',
    'application/vnd.ms-excel': 'xls',
    'application/octet-stream': 'bin',
  }
  return map[mimeType] ?? null
}
