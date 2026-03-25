"use client"

import { useEffect, useState, useCallback } from "react"
import type { ObjectField } from "@/lib/db/schema"

export type ObjectConfig = {
  id: string
  orgId: string
  slug: string
  name: string
  namePlural: string
  icon: string
  color: string
  fields: ObjectField[]
  isSystem: boolean
  position: number
}

type State = {
  config: ObjectConfig | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useObjectConfig(slug: string): State {
  const [config, setConfig] = useState<ObjectConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/objects/${slug}`)
      if (!res.ok) throw new Error(`${res.status}`)
      setConfig(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => { fetch_() }, [fetch_])

  return { config, loading, error, refetch: fetch_ }
}
