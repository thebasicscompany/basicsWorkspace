// Phase 4 stub — knowledge document utilities
import type { KnowledgeDocument, KnowledgeSearchResult } from '../types'

/** Fetch with retry logic (Phase 4 stub — delegates to fetch with no retry) */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  _maxRetries = 3
): Promise<Response> {
  return fetch(url, options)
}

export async function searchKnowledge(
  _query: string,
  _orgId: string,
  _limit?: number
): Promise<KnowledgeSearchResult[]> {
  return []
}

export async function getDocument(_id: string): Promise<KnowledgeDocument | null> {
  return null
}
