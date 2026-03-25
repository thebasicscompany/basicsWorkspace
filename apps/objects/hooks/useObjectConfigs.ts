"use client"

import { useEffect, useState, useCallback } from "react"
import type { ObjectConfig } from "./useObjectConfig"

type State = {
  configs: ObjectConfig[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useObjectConfigs(): State {
  const [configs, setConfigs] = useState<ObjectConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/objects")
      if (!res.ok) throw new Error(`${res.status}`)
      const json = await res.json() as { objects: ObjectConfig[] }
      setConfigs(json.objects)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  return { configs, loading, error, refetch: fetch_ }
}
