// Phase 4 stub — workspace entity permissions
// Will check user permissions against workspace/org-level entities

export type EntityType = 'workspace' | 'workflow' | 'credential'

export interface EntityPermissions {
  canRead: boolean
  canWrite: boolean
  canDelete: boolean
  canAdmin: boolean
}

/**
 * Get user permissions for a given entity.
 * Returns null if the user has no access at all.
 * Phase 4 stub: returns permissive (all allowed) for any authenticated user.
 */
export async function getUserEntityPermissions(
  _userId: string,
  _entityType: EntityType | string,
  _entityId: string
): Promise<EntityPermissions | null> {
  // Phase 4 stub — returns full permissions (single-tenant, no workspace isolation yet)
  return {
    canRead: true,
    canWrite: true,
    canDelete: true,
    canAdmin: true,
  }
}
