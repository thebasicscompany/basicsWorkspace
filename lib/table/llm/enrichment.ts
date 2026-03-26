// Phase 4 stub — AI table column enrichment
import type { TableSummary } from '@/lib/table/types'

export function enrichTableToolDescription(
  baseDescription: string,
  _tables: TableSummary | TableSummary[],
  _toolId?: string
): string {
  return baseDescription
}

export function enrichTableToolParameters(
  baseParams: Record<string, unknown>,
  _tables: TableSummary | TableSummary[],
  _toolId?: string
): { properties: Record<string, unknown>; required: string[] } {
  return {
    properties: (baseParams.properties as Record<string, unknown>) ?? {},
    required: (baseParams.required as string[]) ?? [],
  }
}

export async function enrichRow(
  _row: Record<string, unknown>,
  _columnPrompt: string,
  _orgId: string
): Promise<string> {
  return ''
}
