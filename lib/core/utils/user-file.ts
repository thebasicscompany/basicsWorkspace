// Phase 4 stub — user file utilities
export interface UserFileLike {
  name: string
  type: string
  size: number
  url?: string
}

export function isUserFile(value: unknown): value is UserFileLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    'type' in value &&
    'size' in value
  )
}

export function isUserFileWithMetadata(value: unknown): value is UserFileLike & { url: string } {
  return isUserFile(value) && typeof (value as any).url === 'string'
}
