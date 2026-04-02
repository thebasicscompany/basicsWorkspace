import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { db } from "@/lib/db"
import { recordings } from "@/lib/db/schema/recordings"
import { eq, and } from "drizzle-orm"
import * as fs from "fs"

interface CapturedEvent {
  timestamp: number
  type: "click" | "keyInput" | "windowSwitch" | "scroll" | "clipboard"
  screenshotPath: string
  coordinates?: { x: number; y: number }
  textEntered?: string
  windowTitle?: string
  appName?: string
  screenWidth?: number
  screenHeight?: number
  scaleFactor?: number
  activeWindowBounds?: { x: number; y: number; width: number; height: number }
}

interface UnderstoodAction {
  step: number
  action: string
  element?: string
  app?: string
  value?: string
  confidence: "high" | "medium" | "low"
}

const GATEWAY_URL = process.env.GATEWAY_URL
const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const orgId = session.session.activeOrganizationId || session.user.id

  const [recording] = await db
    .select()
    .from(recordings)
    .where(and(eq(recordings.id, id), eq(recordings.orgId, orgId)))

  if (!recording) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const events = (recording.events as CapturedEvent[]) ?? []
  if (events.length === 0) {
    return NextResponse.json({ error: "No events to understand" }, { status: 400 })
  }

  if (!GATEWAY_URL || !GATEWAY_API_KEY) {
    return NextResponse.json({ error: "Gateway not configured" }, { status: 500 })
  }

  // Update status to processing
  await db
    .update(recordings)
    .set({ status: "processing" })
    .where(eq(recordings.id, id))

  try {
    const actions = await understandEvents(events)

    // Save structured actions back to the recording
    await db
      .update(recordings)
      .set({
        structuredActions: actions,
        status: "converted",
      })
      .where(eq(recordings.id, id))

    return NextResponse.json({ actions })
  } catch (err) {
    await db
      .update(recordings)
      .set({ status: "failed" })
      .where(eq(recordings.id, id))

    console.error("[understand] Failed:", err)
    return NextResponse.json(
      { error: "Understanding failed" },
      { status: 500 }
    )
  }
}

async function understandEvents(events: CapturedEvent[]): Promise<UnderstoodAction[]> {
  // Build messages with screenshots for the vision model
  const eventDescriptions = events.map((e, i) => {
    let desc = `Event ${i + 1}: ${e.type}`
    if (e.coordinates) desc += ` at (${e.coordinates.x}, ${e.coordinates.y})`
    if (e.textEntered) desc += ` — text: "${e.textEntered}"`
    if (e.windowTitle) desc += ` — window: "${e.windowTitle}"`
    if (e.appName) desc += ` — app: ${e.appName}`
    return desc
  })

  // Collect screenshots that exist on disk (base64 encoded)
  const imageMessages: Array<{ type: string; image_url?: { url: string }; text?: string }> = []

  for (let i = 0; i < events.length; i++) {
    const event = events[i]

    // Add event description with metadata
    let desc = `--- Event ${i + 1}: ${event.type}`
    if (event.coordinates) desc += ` at (${event.coordinates.x}, ${event.coordinates.y})`
    if (event.windowTitle) desc += ` in "${event.windowTitle}"`
    if (event.appName) desc += ` [${event.appName}]`
    if (event.textEntered) desc += ` typed: "${event.textEntered}"`
    if (event.activeWindowBounds) {
      const b = event.activeWindowBounds
      desc += ` window-bounds: (${b.x},${b.y} ${b.width}x${b.height})`
    }
    if (event.screenWidth) desc += ` screen: ${event.screenWidth}x${event.screenHeight}@${event.scaleFactor}x`
    desc += " ---"

    imageMessages.push({ type: "text", text: desc })

    // Add screenshot if file exists
    if (event.screenshotPath && fs.existsSync(event.screenshotPath)) {
      const imgData = fs.readFileSync(event.screenshotPath)
      const base64 = imgData.toString("base64")
      const mime = event.screenshotPath.endsWith(".jpg") ? "image/jpeg" : "image/png"
      imageMessages.push({
        type: "image_url",
        image_url: { url: `data:${mime};base64,${base64}` },
      })
    }
  }

  const res = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GATEWAY_API_KEY}`,
    },
    body: JSON.stringify({
      model: "basics-chat-smart-openai",
      messages: [
        {
          role: "system",
          content: `You are a UI action analyzer. Given a sequence of user interaction events with screenshots, describe what the user did in each step.

For each event, return a structured action:
- step: sequential number
- action: short verb phrase describing what happened (e.g. "clicked Send button", "typed email subject", "switched to Slack")
- element: the UI element interacted with (e.g. "Send button", "Subject field", "Slack app")
- app: the application name (e.g. "Gmail", "Slack", "Chrome")
- value: any specific value entered or selected (if applicable)
- confidence: "high", "medium", or "low" based on how certain you are

Return a JSON array of actions. Only return the JSON array, no other text.`,
        },
        {
          role: "user",
          content: imageMessages,
        },
      ],
      temperature: 0.1,
      max_tokens: 4096,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "understood_actions",
          strict: true,
          schema: {
            type: "object",
            properties: {
              actions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    step: { type: "number" },
                    action: { type: "string" },
                    element: { type: "string" },
                    app: { type: "string" },
                    value: { type: "string" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] },
                  },
                  required: ["step", "action", "element", "app", "value", "confidence"],
                  additionalProperties: false,
                },
              },
            },
            required: ["actions"],
            additionalProperties: false,
          },
        },
      },
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Gateway error ${res.status}: ${text}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content ?? "[]"

  try {
    const parsed = JSON.parse(content)
    return parsed.actions ?? parsed
  } catch {
    throw new Error("Failed to parse LLM response as JSON")
  }
}
