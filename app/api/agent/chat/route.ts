import { createOpenAI } from "@ai-sdk/openai"
import { streamText, convertToModelMessages, stepCountIs } from "ai"
import type { UIMessage, ModelMessage } from "ai"
import { eq, asc } from "drizzle-orm"
import { db } from "@/lib/db"
import { chatThreads, chatMessages } from "@/lib/db/schema/chat"
import { requireOrg } from "@/lib/auth-helpers"
import { getAISDKTools } from "@/lib/workspace-tools"

const gatewayBase = process.env.GATEWAY_URL ?? "https://api.basicsos.com"
const gateway = createOpenAI({
  baseURL: `${gatewayBase}/v1`,
  apiKey: process.env.GATEWAY_API_KEY ?? "",
})

const SYSTEM_PROMPT = `You are the Basics OS agent. You help users navigate their workspace, build automations, query their CRM, manage tasks, and get work done.

You have access to workspace tools that let you interact with the user's data. Use them proactively when relevant.

Guidelines:
- Call list_object_types to discover available data types and their fields
- Use search_records to query data — search ONE object type at a time, only when the user asks
- Do NOT exhaustively search every object type. Only search what the user specifically asked about.
- Use create_record / update_record for mutations — confirm with the user before creating or deleting
- Present results clearly — use tables or lists for multiple records
- Be concise. Match the user's energy. Answer in 1-2 tool calls max.`

/** Extract text from UIMessage parts */
function getMessageText(msg: UIMessage): string {
  return (
    msg.parts
      ?.filter((p) => p.type === "text")
      .map((p) => (p as { type: "text"; text: string }).text)
      .join("") ?? ""
  )
}

/** Load persisted messages from DB as ModelMessages for context */
async function loadThreadHistory(threadId: string): Promise<ModelMessage[]> {
  const rows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.threadId, threadId as any))
    .orderBy(asc(chatMessages.createdAt))

  const history: ModelMessage[] = []
  for (const row of rows) {
    if (row.role === "user" && row.content) {
      history.push({ role: "user", content: row.content })
    } else if (row.role === "assistant" && row.content) {
      history.push({ role: "assistant", content: row.content })
    }
    // Skip tool messages in history — the LLM doesn't need them for context
  }
  return history
}

export async function POST(req: Request) {
  const ctx = await requireOrg(req)
  if (ctx instanceof Response) return ctx

  const body = await req.json()
  const { messages, threadId }: { messages: UIMessage[]; threadId?: string } = body

  // Persist the new user message to the thread
  const activeThreadId = threadId
  if (activeThreadId && messages.length > 0) {
    const lastMsg = messages[messages.length - 1]
    if (lastMsg.role === "user") {
      await db.insert(chatMessages).values({
        threadId: activeThreadId as any,
        role: "user",
        content: getMessageText(lastMsg),
      })
      await db
        .update(chatThreads)
        .set({ updatedAt: new Date() })
        .where(eq(chatThreads.id, activeThreadId as any))
    }
  }

  // Convert client messages to model messages
  const clientModelMessages = await convertToModelMessages(messages)

  // If we have a thread, prepend DB history so the LLM has full context
  // (assistant-ui sends only the messages in the current session, not persisted ones)
  let allModelMessages = clientModelMessages
  if (activeThreadId) {
    const history = await loadThreadHistory(activeThreadId)
    if (history.length > 0) {
      // Only prepend history that isn't already in the client messages
      // The client sends its session messages; DB has the full thread.
      // Use DB history as the authoritative source, append only the latest user message.
      const lastClientMsg = clientModelMessages[clientModelMessages.length - 1]
      if (lastClientMsg && clientModelMessages.length <= 2) {
        // Client only has 1-2 messages (just sent) — prepend full history
        allModelMessages = [...history, lastClientMsg]
      }
    }
  }

  const result = streamText({
    model: gateway.chat("basics-chat-smart-openai"),
    system: SYSTEM_PROMPT,
    messages: allModelMessages,
    tools: getAISDKTools({ orgId: ctx.orgId, userId: ctx.userId }),
    stopWhen: stepCountIs(3),

    async onFinish({ response }) {
      if (!activeThreadId) return

      for (const msg of response.messages) {
        if (msg.role === "assistant") {
          const contentParts = Array.isArray(msg.content) ? msg.content : []
          const textContent =
            typeof msg.content === "string"
              ? msg.content
              : contentParts
                  .filter((p: any) => p.type === "text")
                  .map((p: any) => p.text)
                  .join("")
          const toolCallParts = contentParts.filter(
            (p: any) => p.type === "tool-call"
          )

          await db.insert(chatMessages).values({
            threadId: activeThreadId as any,
            role: "assistant",
            content: textContent || null,
            toolCalls: toolCallParts.length > 0 ? toolCallParts : null,
          })
        } else if (msg.role === "tool") {
          await db.insert(chatMessages).values({
            threadId: activeThreadId as any,
            role: "tool",
            content: null,
            toolResults: Array.isArray(msg.content)
              ? msg.content
              : [msg.content],
          })
        }
      }

      // Auto-title from the first user message
      const [thread] = await db
        .select({ title: chatThreads.title })
        .from(chatThreads)
        .where(eq(chatThreads.id, activeThreadId as any))
        .limit(1)

      if (thread?.title === "New conversation" && messages.length > 0) {
        const firstUserMsg = messages.find((m) => m.role === "user")
        if (firstUserMsg) {
          const content = getMessageText(firstUserMsg)
          const title = content.slice(0, 80) || "New conversation"
          await db
            .update(chatThreads)
            .set({ title })
            .where(eq(chatThreads.id, activeThreadId as any))
        }
      }
    },
  })

  return result.toUIMessageStreamResponse()
}
