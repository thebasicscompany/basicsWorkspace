/**
 * Next.js instrumentation hook — runs once on server startup.
 * Starts the schedule worker for self-hosted deployments.
 */
export async function register() {
  // Only run in Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only start the worker if not explicitly disabled
    if (process.env.DISABLE_SCHEDULE_WORKER !== 'true') {
      const { startScheduleWorker } = await import('@/lib/schedules/worker')
      await startScheduleWorker()
    }
  }
}
