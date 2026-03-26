// Phase 4 stub — execution snapshot service

export async function saveExecutionSnapshot(
  _executionId: string,
  _snapshot: unknown
): Promise<void> {}

export async function getExecutionSnapshot(_executionId: string): Promise<unknown | null> {
  return null
}

/** Singleton snapshot service object (Phase 4 stub) */
export const snapshotService = {
  save: async (_executionId: string, _snapshot: unknown): Promise<void> => {},
  get: async (_executionId: string): Promise<unknown | null> => null,
  delete: async (_executionId: string): Promise<void> => {},
  createSnapshotWithDeduplication: async (
    _workflowId: string,
    _state: unknown
  ): Promise<{ snapshot: { id: string } }> => ({
    snapshot: { id: crypto.randomUUID() },
  }),
}
