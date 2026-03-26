// Phase 4 stub — execution file context
import type { UserFile } from '@/lib/sim/executor/types'

export interface ExecutionFileContext {
  orgId: string
  workflowId?: string
  executionId?: string
}

export function getExecutionFileContext(_ctx: unknown): ExecutionFileContext | null {
  return null
}

/**
 * Upload a file generated during execution to storage.
 * Accepts (ctx, buffer, name, mimeType?, userId?) — Phase 4 stub throws.
 */
export async function uploadExecutionFile(
  _ctx: ExecutionFileContext,
  _data: Buffer | string,
  _filename: string,
  _mimeType?: string,
  _userId?: string
): Promise<UserFile> {
  throw new Error('Execution file uploads not yet implemented (Phase 4)')
}

/**
 * Upload raw file data from an execution step.
 * Accepts (rawData, ctx, userId?) — Phase 4 stub throws.
 */
export async function uploadFileFromRawData(
  _rawData: { name: string; data: Buffer | string; mimeType?: string },
  _ctx: ExecutionFileContext,
  _userId?: string
): Promise<UserFile> {
  throw new Error('Execution file uploads not yet implemented (Phase 4)')
}
