'use client'

import { useParams } from 'next/navigation'
import { parseCronToHumanReadable } from '@/lib/workflows/schedules/utils'
import { useScheduleQuery, useRedeployWorkflowSchedule } from '@/apps/automations/hooks/use-schedule-query'
import { useSubBlockStore } from '@/apps/automations/stores/subblock'
import { MAX_CONSECUTIVE_FAILURES } from '@/lib/sim/triggers/constants'

interface ScheduleInfoProps {
  blockId: string
  isPreview?: boolean
}

/**
 * Schedule status display component.
 * Shows the current schedule status, next run time, and last run time.
 * Schedule creation/deletion is handled during workflow deploy/undeploy.
 */
export function ScheduleInfo({ blockId, isPreview = false }: ScheduleInfoProps) {
  const params = useParams()
  const workflowId = params.id as string

  const scheduleTimezone = useSubBlockStore((state) => state.getValue(blockId, 'timezone')) as
    | string
    | undefined

  const { data: schedule, isLoading } = useScheduleQuery(workflowId, blockId, {
    enabled: !isPreview,
  })

  const redeployMutation = useRedeployWorkflowSchedule()

  const handleRedeploy = () => {
    if (isPreview || redeployMutation.isPending) return
    redeployMutation.mutate({ workflowId, blockId })
  }

  if (!schedule || isLoading) {
    return null
  }

  const timezone = scheduleTimezone || schedule?.timezone || 'UTC'
  const failedCount = schedule?.failedCount || 0
  const isDisabled = schedule?.status === 'disabled'
  const nextRunAt = schedule?.nextRunAt ? new Date(schedule.nextRunAt) : null

  return (
    <div className='space-y-1.5'>
      {/* Status badges */}
      {(failedCount > 0 || isDisabled) && (
        <div className='space-y-1'>
          <div className='flex flex-wrap items-center gap-2'>
            {failedCount >= MAX_CONSECUTIVE_FAILURES && isDisabled ? (
              <button
                onClick={handleRedeploy}
                className='rounded-full border px-2 py-0.5 text-[11px] font-medium'
                style={{
                  borderColor: '#f97316',
                  color: '#f97316',
                }}
              >
                {redeployMutation.isPending ? 'redeploying...' : 'disabled'}
              </button>
            ) : failedCount > 0 ? (
              <span
                className='rounded-full border px-2 py-0.5 text-[11px] font-medium'
                style={{
                  borderColor: '#f97316',
                  color: '#f97316',
                }}
              >
                {failedCount} failed
              </span>
            ) : null}
          </div>
          {failedCount >= MAX_CONSECUTIVE_FAILURES && isDisabled && (
            <p className='text-[12px] text-[var(--color-text-tertiary)]'>
              Disabled after {MAX_CONSECUTIVE_FAILURES} consecutive failures
            </p>
          )}
          {redeployMutation.isError && (
            <p className='text-[12px] text-red-500'>
              Failed to redeploy. Please try again.
            </p>
          )}
        </div>
      )}

      {/* Schedule info - only show when active */}
      {!isDisabled && (
        <div className='text-[12px] text-[var(--color-text-tertiary)]'>
          {schedule?.cronExpression && (
            <span>{parseCronToHumanReadable(schedule.cronExpression, timezone)}</span>
          )}
          {nextRunAt && (
            <>
              {schedule?.cronExpression && <span className='mx-1'>·</span>}
              <span>
                Next:{' '}
                {nextRunAt.toLocaleString('en-US', {
                  timeZone: timezone,
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
