"use client"

import { useEffect, useState, useCallback } from "react"
import type { ApiRecord } from "@/apps/crm/types"

type RecordsState<T> = {
  data: T[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useRecords<T>(
  type: string,
  transform: (record: ApiRecord) => T,
  params?: Record<string, string>
): RecordsState<T> {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams({ type, limit: "200", ...params })
      const res = await fetch(`/api/records?${qs}`)
      if (!res.ok) throw new Error(`${res.status}`)
      const json = await res.json() as { records: ApiRecord[] }
      setData(json.records.map(transform))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  // params is an object — stringify for stable dep
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, JSON.stringify(params)])

  useEffect(() => { fetch_() }, [fetch_])

  return { data, loading, error, refetch: fetch_ }
}
