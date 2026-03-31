import type {
  Artifact,
  Message,
  Task,
  TaskArtifactUpdateEvent,
  TaskState,
  TaskStatusUpdateEvent,
} from '@a2a-js/sdk'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createA2AClient, extractTextContent, isTerminalState } from '@/lib/a2a/utils'
import { generateRequestId } from '@/lib/core/utils/request'

const logger = { info: (...args: any[]) => console.log('[a2a-resubscribe]', ...args), warn: (...args: any[]) => console.warn('[a2a-resubscribe]', ...args), error: (...args: any[]) => console.error('[a2a-resubscribe]', ...args) }

export const dynamic = 'force-dynamic'

const A2AResubscribeSchema = z.object({
  agentUrl: z.string().min(1, 'Agent URL is required'),
  taskId: z.string().min(1, 'Task ID is required'),
  apiKey: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const body = await request.json()
    const validatedData = A2AResubscribeSchema.parse(body)

    const client = await createA2AClient(validatedData.agentUrl, validatedData.apiKey)

    const stream = client.resubscribeTask({ id: validatedData.taskId })

    let taskId = validatedData.taskId
    let contextId: string | undefined
    let state: TaskState = 'working'
    let content = ''
    let artifacts: Artifact[] = []
    let history: Message[] = []

    for await (const event of stream) {
      if (event.kind === 'message') {
        const msg = event as Message
        content = extractTextContent(msg)
        taskId = msg.taskId || taskId
        contextId = msg.contextId || contextId
        state = 'completed'
      } else if (event.kind === 'task') {
        const task = event as Task
        taskId = task.id
        contextId = task.contextId
        state = task.status.state
        artifacts = task.artifacts || []
        history = task.history || []
        const lastAgentMessage = history.filter((m) => m.role === 'agent').pop()
        if (lastAgentMessage) {
          content = extractTextContent(lastAgentMessage)
        }
      } else if ('status' in event) {
        const statusEvent = event as TaskStatusUpdateEvent
        state = statusEvent.status.state
      } else if ('artifact' in event) {
        const artifactEvent = event as TaskArtifactUpdateEvent
        artifacts.push(artifactEvent.artifact)
      }
    }

    logger.info(`[${requestId}] Successfully resubscribed to A2A task ${taskId}`)

    return NextResponse.json({
      success: true,
      output: {
        taskId,
        contextId,
        state,
        isRunning: !isTerminalState(state),
        artifacts,
        history,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid A2A resubscribe data`, { errors: error.issues })
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.issues,
        },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Error resubscribing to A2A task:`, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to resubscribe',
      },
      { status: 500 }
    )
  }
}
