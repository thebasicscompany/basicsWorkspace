export interface SubBlockStore {
  workflowValues: Record<string, Record<string, Record<string, any>>>
  setValue: (blockId: string, subBlockId: string, value: any) => void
  getValue: (blockId: string, subBlockId: string) => any
  clear: () => void
  initializeFromWorkflow: (workflowId: string, blocks: Record<string, any>) => void
  setWorkflowValues: (workflowId: string, values: Record<string, Record<string, any>>) => void
}
