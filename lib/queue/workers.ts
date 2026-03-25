import type { Job } from "pg-boss"
import { db } from "../db"
import { contextEmbeddings } from "../db/schema"
import { queue } from "../queue"
import type {
  CheckAutomationTriggersJob,
  EmbedEntityJob,
  RunAutomationJob,
} from "../queue"

// Worker 1 — Fan-out to matching automation triggers
export function registerCheckAutomationTriggersWorker() {
  queue.work<CheckAutomationTriggersJob>(
    "check-automation-triggers",
    async (jobs: Job<CheckAutomationTriggersJob>[]) => {
      for (const job of jobs) {
        const { orgId, eventType, entityType, entityId } = job.data
        // Phase 3: query deployed workflows and fan-out to run-automation jobs
        // const matching = await getWorkflowsWithTrigger(orgId, eventType)
        // for (const workflow of matching) {
        //   await queue.send("run-automation", { workflowId: workflow.id, triggerData: { eventType, entityType, entityId, payload: {} } })
        // }
        console.log("[worker] check-automation-triggers", { orgId, eventType, entityType, entityId })
      }
    }
  )
}

// Worker 2 — Refresh embedding for a changed entity
export function registerEmbedEntityWorker() {
  queue.work<EmbedEntityJob>(
    "embed-entity",
    async (jobs: Job<EmbedEntityJob>[]) => {
      for (const job of jobs) {
        const { orgId, entityType, entityId } = job.data

        const chunks = await getEntityChunks(entityType, entityId)
        if (!chunks.length) continue

        for (const { chunkIndex, text } of chunks) {
          const embedding = await gatewayEmbedding(text)
          if (!embedding) continue

          await db
            .insert(contextEmbeddings)
            .values({
              orgId,
              entityType,
              entityId: entityId as `${string}-${string}-${string}-${string}-${string}`,
              chunkIndex,
              chunkText: text,
              embedding,
              model: "basics-embed-small",
            })
            .onConflictDoUpdate({
              target: [
                contextEmbeddings.entityType,
                contextEmbeddings.entityId,
                contextEmbeddings.chunkIndex,
              ],
              set: {
                chunkText: text,
                embedding,
                createdAt: new Date(),
              },
            })
        }
      }
    }
  )
}

// Worker 3 — Execute a specific automation (Phase 3 — Sim integration)
export function registerRunAutomationWorker() {
  queue.work<RunAutomationJob>(
    "run-automation",
    async (jobs: Job<RunAutomationJob>[]) => {
      for (const job of jobs) {
        const { workflowId, triggerData } = job.data
        // Phase 3: await executeSimWorkflow(workflowId, triggerData)
        console.log("[worker] run-automation", { workflowId, triggerData })
      }
    }
  )
}

export function registerAllWorkers() {
  registerCheckAutomationTriggersWorker()
  registerEmbedEntityWorker()
  registerRunAutomationWorker()
}

// --- Helpers ---

async function getEntityChunks(
  entityType: string,
  entityId: string
): Promise<{ chunkIndex: number; text: string }[]> {
  // Phase 2B: query the records table and build chunk text per entity type
  // For now returns empty — will be filled in when records API is built
  return []
}

async function gatewayEmbedding(text: string): Promise<number[] | null> {
  const url = process.env.GATEWAY_URL
  if (!url) {
    console.warn("[embed-entity] GATEWAY_URL not set — skipping embedding")
    return null
  }
  const res = await fetch(`${url}/v1/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, model: "basics-embed-small" }),
  })
  if (!res.ok) {
    console.error("[embed-entity] gateway error", res.status, await res.text())
    return null
  }
  const data = (await res.json()) as { embedding: number[] }
  return data.embedding
}
