import { createOpenAI } from "@ai-sdk/openai"
import { streamText, convertToModelMessages } from "ai"
import type { UIMessage } from "ai"

const gateway = createOpenAI({
  baseURL: process.env.GATEWAY_URL ?? "https://api.basicsos.com/v1",
  apiKey: process.env.GATEWAY_API_KEY ?? "",
})

const SYSTEM_PROMPT = `You are the Basics OS Context Intelligence. You help users understand and query their entire workspace — contacts, companies, deals, tasks, notes, meetings, and automations.

When answering:
- Be concise and direct. Lead with the answer.
- If the user asks about specific records (a person, company, deal), explain what you know from the workspace context.
- If you don't have specific data, offer to help them search or navigate.
- Format lists and structured data clearly using markdown.
- Use a conversational but professional tone.

You have access to the user's workspace context including CRM records, activity events, and semantic embeddings of all content. Answer as if you've deeply read everything in their workspace.`

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  const result = streamText({
    model: gateway("basics-chat-smart"),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}
