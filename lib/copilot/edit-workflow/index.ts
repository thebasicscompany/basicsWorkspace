/**
 * Edit workflow module — barrel export
 */
export { applyOperationsToWorkflowState } from './engine'
export type {
  ApplyOperationsResult,
  EditWorkflowOperation,
  EditWorkflowParams,
  OperationContext,
  PermissionGroupConfig,
  SkippedItem,
  ValidationError,
} from './types'
