// Phase 4 stub — permission group types
export type PermissionGroup = 'admin' | 'member' | 'viewer'

export interface PermissionPolicy {
  group: PermissionGroup
  permissions: string[]
}

/** Configuration for a named permission group */
export interface PermissionGroupConfig {
  id: string
  name: string
  permissions: string[]
  inherits?: string[]
}
