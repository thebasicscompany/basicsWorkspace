'use client'

import { useCallback, useEffect, useState } from 'react'

export interface ScheduleData {
  id: string
  workflowId: string
  blockId: string
  cronExpression: string | null
  timezone: string
  status: string
  nextRunAt: string | null
  lastRunAt: string | null
  failedCount: number
}

/**
 * Hook to fetch schedule data for a specific workflow/block.
 * Polls the /api/schedules endpoint.
 */
export function useScheduleQuery(
  workflowId: string,
  blockId: string,
  opts?: { enabled?: boolean }
) {
  const [data, setData] = useState<ScheduleData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const enabled = opts?.enabled ?? true

  const fetchSchedule = useCallback(async () => {
    if (!enabled || !workflowId) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/schedules?workflowId=${workflowId}&blockId=${blockId}`)
      if (!res.ok) {
        setData(null)
        return
      }
      const json = await res.json()
      // API returns array of schedules — find the one for this block
      const schedules = json.schedules || json.data || []
      const match = Array.isArray(schedules)
        ? schedules.find((s: any) => s.blockId === blockId) || schedules[0] || null
        : null
      setData(match)
    } catch {
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [workflowId, blockId, enabled])

  useEffect(() => {
    fetchSchedule()
  }, [fetchSchedule])

  return { data, isLoading, refetch: fetchSchedule }
}

/**
 * Hook to redeploy a workflow schedule (resets failure count).
 * Stubbed — calls deploy endpoint which recreates the schedule.
 */
export function useRedeployWorkflowSchedule() {
  const [isPending, setIsPending] = useState(false)
  const [isError, setIsError] = useState(false)

  const mutate = useCallback(async ({ workflowId }: { workflowId: string; blockId: string }) => {
    setIsPending(true)
    setIsError(false)
    try {
      const res = await fetch(`/api/workflows/${workflowId}/deploy`, { method: 'POST' })
      if (!res.ok) throw new Error('Redeploy failed')
    } catch {
      setIsError(true)
    } finally {
      setIsPending(false)
    }
  }, [])

  return { mutate, isPending, isError }
}
