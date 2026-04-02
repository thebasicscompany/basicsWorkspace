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
  elementUnderCursor?: {
    role: string
    name: string
    value?: string
    bounds?: { x: number; y: number; width: number; height: number }
  }
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

// ---------------------------------------------------------------------------
// Stage 1: Label events from structured metadata (no LLM)
// ---------------------------------------------------------------------------

interface LabeledAction {
  step: number
  action: string
  element: string
  app: string
  value: string
  confidence: "high" | "medium" | "low"
  needsVision: boolean // true = a11y data missing, screenshot needed for identification
}

function labelEvents(events: CapturedEvent[]): LabeledAction[] {
  return events.map((event, i) => {
    const app = event.appName || ""
    const el = event.elementUnderCursor
    const hasA11y = !!el?.name || !!el?.role

    switch (event.type) {
      case "click": {
        if (hasA11y) {
          const elementDesc = el!.name
            ? `${el!.name} ${el!.role}`.trim()
            : el!.role
          return {
            step: i + 1,
            action: `clicked ${elementDesc}`,
            element: elementDesc,
            app,
            value: el!.value || "",
            confidence: "high",
            needsVision: false,
          }
        }
        // No a11y — need vision to identify the element
        const coordDesc = event.coordinates
          ? `element at (${event.coordinates.x}, ${event.coordinates.y})`
          : "unknown element"
        return {
          step: i + 1,
          action: `clicked ${coordDesc}`,
          element: coordDesc,
          app,
          value: "",
          confidence: "low",
          needsVision: true,
        }
      }

      case "keyInput":
        return {
          step: i + 1,
          action: `typed ${event.textEntered || "text"}`,
          element: el?.name ? `${el.name} ${el.role}` : "text field",
          app,
          value: event.textEntered || "",
          confidence: hasA11y ? "high" : "medium",
          needsVision: false,
        }

      case "windowSwitch":
        return {
          step: i + 1,
          action: `switched to ${event.windowTitle || "window"}`,
          element: event.windowTitle || "window",
          app,
          value: "",
          confidence: "high",
          needsVision: false,
        }

      case "scroll":
        return {
          step: i + 1,
          action: "scrolled",
          element: event.windowTitle || "page",
          app,
          value: "",
          confidence: "medium",
          needsVision: false,
        }

      case "clipboard":
        return {
          step: i + 1,
          action: "copied to clipboard",
          element: "clipboard",
          app,
          value: event.textEntered || "",
          confidence: "high",
          needsVision: false,
        }

      default:
        return {
          step: i + 1,
          action: event.type,
          element: "unknown",
          app,
          value: "",
          confidence: "low",
          needsVision: true,
        }
    }
  })
}

// ---------------------------------------------------------------------------
// Stage 2: LLM call — only for workflow synthesis + resolving unknowns
// ---------------------------------------------------------------------------

async function understandEvents(events: CapturedEvent[]): Promise<UnderstoodAction[]> {
  const labeled = labelEvents(events)

  // Count events that need vision (no a11y data)
  const needVision = labeled.filter((a) => a.needsVision)
  const allResolved = needVision.length === 0

  // Build the action summary for the LLM
  const actionList = labeled
    .map((a) => {
      let line = `${a.step}. [${a.app || "unknown app"}] ${a.action}`
      if (a.value) line += ` — value: "${a.value}"`
      if (a.needsVision) line += ` ⚠️ needs identification`
      line += ` (confidence: ${a.confidence})`
      return line
    })
    .join("\n")

  // If all events have a11y data, use a cheap text-only model
  // If some need vision, include only those screenshots
  const messages: Array<Record<string, unknown>> = [
    {
      role: "system",
      content: `You are a workflow analyzer. You receive a sequence of labeled user actions captured from a screen recording.

Your job:
1. For actions marked "needs identification", use the attached screenshot to determine which UI element was interacted with.
2. Clean up the action sequence: remove noise (accidental clicks, redundant scrolls), merge related actions.
3. Return the final structured workflow as a JSON array.

Each action must have: step (number), action (verb phrase), element (UI element name), app (application), value (any entered/selected value or empty string), confidence ("high"/"medium"/"low").`,
    },
  ]

  if (allResolved) {
    // Text-only — no screenshots needed
    messages.push({
      role: "user",
      content: `Here is the recorded action sequence:\n\n${actionList}\n\nAll actions have been identified from accessibility data. Clean up and return the final workflow.`,
    })
  } else {
    // Include screenshots only for unresolved events
    const content: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: `Here is the recorded action sequence:\n\n${actionList}\n\nSome actions need visual identification. Screenshots for those events are attached below.`,
      },
    ]

    for (const action of needVision) {
      const event = events[action.step - 1]
      if (event.screenshotPath && fs.existsSync(event.screenshotPath)) {
        const imgData = fs.readFileSync(event.screenshotPath)
        const base64 = imgData.toString("base64")
        const mime = event.screenshotPath.endsWith(".jpg") ? "image/jpeg" : "image/png"
        content.push({
          type: "text",
          text: `Screenshot for step ${action.step} (${event.type} at ${event.coordinates?.x},${event.coordinates?.y} in ${event.appName || "unknown app"}):`,
        })
        content.push({
          type: "image_url",
          image_url: { url: `data:${mime};base64,${base64}` },
        })
      }
    }

    messages.push({ role: "user", content })
  }

  // Use a cheaper/faster model when no vision is needed
  const model = allResolved ? "basics-chat-fast-openai" : "basics-chat-smart-openai"

  const res = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GATEWAY_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
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
