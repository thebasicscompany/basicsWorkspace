/**
 * Phase 4 stubs — EE access-control permission checks.
 * All checks pass unconditionally in Phase 3. Phase 4 wires real RBAC.
 */
export async function validateBlockType(
  _userId: string | undefined,
  _blockType: string,
  _ctx?: unknown
): Promise<void> {}

export async function validateCustomToolsAllowed(
  _userId: string | undefined,
  _ctx?: unknown
): Promise<void> {}

export async function validateMcpToolsAllowed(
  _userId: string | undefined,
  _ctx?: unknown
): Promise<void> {}

export async function validateModelProvider(
  _userId: string | undefined,
  _model: string,
  _ctx?: unknown
): Promise<void> {}

export async function validateSkillsAllowed(
  _userId: string | undefined,
  _ctx?: unknown
): Promise<void> {}
