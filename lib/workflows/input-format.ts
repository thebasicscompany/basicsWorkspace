// Phase 4 stub — workflow input field extraction
export interface InputField {
  name: string
  type: string
  required?: boolean
}

export function extractInputFieldsFromBlocks(
  _blocks: Record<string, unknown>
): InputField[] {
  return []
}
