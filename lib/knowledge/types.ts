// Phase 4 stub — knowledge base types

/** Structured filter for knowledge base or table queries */
export type StructuredFilter =
  | { field: string; op?: string; value: string | number; not?: boolean }
  | { tagName: string; tagSlot: string; fieldType: string; operator: string; value: string | number | boolean; valueTo?: string | number }
  | { and?: StructuredFilter[]; or?: StructuredFilter[] }
  | Record<string, unknown>

export interface KnowledgeDocument {
  id: string
  orgId: string
  title: string
  content: string
  embedding?: number[]
  createdAt: string
}

export interface KnowledgeSearchResult {
  document: KnowledgeDocument
  score: number
  excerpt: string
}
