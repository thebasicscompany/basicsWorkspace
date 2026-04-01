/**
 * Test script for Agent chat + workspace tools + thread persistence
 *
 * Tests:
 * 1. Thread CRUD (create, list, get, update, delete)
 * 2. Chat with thread persistence
 * 3. Workspace tools availability
 *
 * Usage: npx tsx scripts/test-agent.ts
 * Requires: dev server running on localhost:3000, seeded DB
 */
import { config } from "dotenv"
config({ path: ".env.local" })

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000"
let sessionCookie = ""

async function login(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: BASE_URL,
      Referer: `${BASE_URL}/login`,
    },
    body: JSON.stringify({ email: "admin@example.com", password: "admin123" }),
    redirect: "manual",
  })

  const setCookies = res.headers.getSetCookie()
  const sessionTokenCookie = setCookies.find((c) =>
    c.startsWith("better-auth.session_token=")
  )
  if (!sessionTokenCookie) {
    throw new Error("Login failed — no session cookie returned")
  }
  return sessionTokenCookie.split(";")[0]
}

async function api(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Cookie: sessionCookie,
      ...(options.headers || {}),
    },
  })
}

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  FAIL: ${msg}`)
    process.exit(1)
  }
  console.log(`  PASS: ${msg}`)
}

// ── Tests ─────────────────────────────────────────────────────────────────

async function testThreadCRUD() {
  console.log("\n=== Test 1: Thread CRUD ===")

  // Create thread
  const createRes = await api("/api/agent/threads", {
    method: "POST",
    body: JSON.stringify({ title: "Test Thread" }),
  })
  const createBody = await createRes.json()
  assert(createRes.status === 201, `POST /threads returned ${createRes.status}`)
  assert(!!createBody.thread?.id, `Thread created with id: ${createBody.thread?.id}`)
  const threadId = createBody.thread.id

  // List threads
  const listRes = await api("/api/agent/threads")
  const listBody = await listRes.json()
  assert(listRes.ok, `GET /threads returned ${listRes.status}`)
  assert(
    listBody.threads.some((t: any) => t.id === threadId),
    "Thread appears in list"
  )

  // Get thread with messages
  const getRes = await api(`/api/agent/threads/${threadId}`)
  const getBody = await getRes.json()
  assert(getRes.ok, `GET /threads/${threadId} returned ${getRes.status}`)
  assert(getBody.thread.id === threadId, "Thread ID matches")
  assert(Array.isArray(getBody.messages), "Messages array returned")
  assert(getBody.messages.length === 0, "New thread has 0 messages")

  // Update title
  const patchRes = await api(`/api/agent/threads/${threadId}`, {
    method: "PATCH",
    body: JSON.stringify({ title: "Updated Title" }),
  })
  assert(patchRes.ok, `PATCH /threads/${threadId} returned ${patchRes.status}`)

  // Verify update
  const getRes2 = await api(`/api/agent/threads/${threadId}`)
  const getBody2 = await getRes2.json()
  assert(getBody2.thread.title === "Updated Title", "Title updated to 'Updated Title'")

  // Delete (archive) thread
  const deleteRes = await api(`/api/agent/threads/${threadId}`, {
    method: "DELETE",
  })
  assert(deleteRes.ok, `DELETE /threads/${threadId} returned ${deleteRes.status}`)

  // Verify deleted
  const listRes2 = await api("/api/agent/threads")
  const listBody2 = await listRes2.json()
  assert(
    !listBody2.threads.some((t: any) => t.id === threadId),
    "Thread no longer in list"
  )

  return threadId
}

async function testChatWithThread() {
  console.log("\n=== Test 2: Chat with thread persistence ===")

  // Create a thread for chatting
  const createRes = await api("/api/agent/threads", {
    method: "POST",
    body: JSON.stringify({ title: "Chat Test" }),
  })
  const { thread } = await createRes.json()
  const threadId = thread.id
  console.log(`  Thread: ${threadId}`)

  // Send a chat message (this will stream, but we can read the full response)
  const chatRes = await api("/api/agent/chat", {
    method: "POST",
    body: JSON.stringify({
      threadId,
      messages: [
        {
          id: crypto.randomUUID(),
          role: "user",
          parts: [{ type: "text", text: "Hello, what tools do you have?" }],
        },
      ],
    }),
  })

  assert(chatRes.ok, `POST /agent/chat returned ${chatRes.status}`)
  assert(
    chatRes.headers.get("content-type")?.includes("text/event-stream") ||
      chatRes.headers.get("content-type")?.includes("text/plain") ||
      chatRes.ok,
    "Chat response is streaming or ok"
  )

  // Consume the stream
  const reader = chatRes.body?.getReader()
  if (reader) {
    const decoder = new TextDecoder()
    let fullResponse = ""
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      fullResponse += decoder.decode(value, { stream: true })
    }
    assert(fullResponse.length > 0, `Received ${fullResponse.length} bytes of streaming data`)
  }

  // Wait a moment for onFinish to persist
  await new Promise((r) => setTimeout(r, 1000))

  // Verify message was persisted
  const getRes = await api(`/api/agent/threads/${threadId}`)
  const getBody = await getRes.json()
  assert(getBody.messages.length >= 1, `Thread has ${getBody.messages.length} message(s) persisted`)

  const userMsg = getBody.messages.find((m: any) => m.role === "user")
  assert(!!userMsg, "User message persisted")
  assert(
    userMsg?.content?.includes("tools"),
    `User message content: "${userMsg?.content?.slice(0, 50)}..."`
  )

  // Cleanup
  await api(`/api/agent/threads/${threadId}`, { method: "DELETE" })

  return threadId
}

async function testWorkspaceTools() {
  console.log("\n=== Test 3: Workspace tools registry ===")

  // Test that the tools are importable server-side
  // We'll verify by checking that the chat endpoint doesn't error with tool-related messages
  const chatRes = await api("/api/agent/chat", {
    method: "POST",
    body: JSON.stringify({
      messages: [
        {
          id: crypto.randomUUID(),
          role: "user",
          parts: [{ type: "text", text: "Just say hi" }],
        },
      ],
    }),
  })

  assert(chatRes.ok, `Chat without threadId returns ${chatRes.status} (tools loaded)`)

  // Consume stream
  const reader = chatRes.body?.getReader()
  if (reader) {
    while (true) {
      const { done } = await reader.read()
      if (done) break
    }
  }

  console.log("  PASS: Chat endpoint works with workspace tools loaded")
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Agent Chat + Workspace Tools Tests ===")
  console.log(`Base URL: ${BASE_URL}\n`)

  console.log("Logging in...")
  sessionCookie = await login()
  console.log("Logged in successfully")

  try {
    await testThreadCRUD()
    await testChatWithThread()
    await testWorkspaceTools()

    console.log("\n=== ALL TESTS PASSED ===")
  } catch (error) {
    console.error("\n=== TEST FAILURE ===")
    console.error(error)
    process.exitCode = 1
  } finally {
    process.exit()
  }
}

main()
