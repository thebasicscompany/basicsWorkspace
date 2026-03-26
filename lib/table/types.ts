// Phase 4 stub — AI table types

export type ColumnType = 'text' | 'number' | 'boolean' | 'date' | 'ai' | 'select' | 'json'

export interface ColumnDefinition {
  id: string
  name: string
  type: ColumnType
  required?: boolean
  aiConfig?: Record<string, unknown>
}

export interface TableColumn {
  id: string
  name: string
  type: ColumnType
}

export interface RowData {
  id: string
  [key: string]: unknown
}

export interface TableRow {
  id: string
  data: Record<string, unknown>
}

export interface Filter {
  column: string
  op: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'isNull' | 'isNotNull'
  value?: unknown
}

export interface Sort {
  column: string
  direction: 'asc' | 'desc'
}

export interface TableDefinition {
  id: string
  orgId: string
  name: string
  columns: ColumnDefinition[]
  createdAt: string
  updatedAt: string
}

export interface TableSchema {
  id: string
  name: string
  columns: ColumnDefinition[]
}

export interface TableSummary {
  id?: string
  name: string
  rowCount?: number
  columns: Pick<ColumnDefinition, 'id' | 'name' | 'type'>[]
}
