import { createOpenAI } from "@ai-sdk/openai"
import { streamText, convertToModelMessages } from "ai"
import type { UIMessage } from "ai"

const gatewayBase = process.env.GATEWAY_URL ?? "https://api.basicsos.com"
const gateway = createOpenAI({
  baseURL: `${gatewayBase}/v1`,
  apiKey: process.env.GATEWAY_API_KEY ?? "",
})

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  const result = streamText({
    model: gateway.chat("basics-chat-smart"),
    system:
      "You are the Basics OS agent. You help users navigate their workspace, build automations, query their CRM, manage tasks, and get work done.",
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}
