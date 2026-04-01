/**
 * Unified demo seed script — seeds everything a new engineer needs:
 *   1. Admin user + org (via existing seed.ts logic)
 *   2. Companies, contacts, deals, tasks, notes (CRM data)
 *   3. Workflows with blocks and edges (automations)
 *
 * Usage: npx tsx scripts/seed-demo.ts
 * Prereq: DATABASE_URL set in .env.local, schema pushed (npm run db:push)
 */
import { config } from "dotenv"
config({ path: ".env.local" })

const ORG_ID = "org_seed_default"

async function main() {
  const { db } = await import("../lib/db")
  const {
    workflows,
    workflowBlocks,
    workflowEdges,
    workflowExecutionLogs,
  } = await import("../lib/db/schema/workflows")
  const { records, objectConfig } = await import("../lib/db/schema/objects")
  const { member, user, organization } = await import("../lib/db/schema/auth")
  const { eq, sql } = await import("drizzle-orm")

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 0: Seed admin user + org (idempotent)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("=== Step 0: Admin user & org ===")

  const [existingUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, "admin@example.com"))
    .limit(1)

  let userId: string
  if (existingUser) {
    userId = existingUser.id
    console.log(`  Admin user exists: ${userId}`)
  } else {
    // Import and run the base seed
    console.log("  Running base seed (admin user + org + system objects)...")
    // Use dynamic import to run seed.ts inline
    const seedModule = await import("./seed")
    // seed.ts runs on import — if it doesn't, call it explicitly
    userId = ""
    const [m] = await db
      .select({ userId: member.userId })
      .from(member)
      .where(eq(member.organizationId, ORG_ID))
      .limit(1)
    userId = m?.userId ?? ""
    if (!userId) {
      console.error("  ERROR: Base seed failed. Run `npx tsx scripts/seed.ts` first.")
      process.exit(1)
    }
    console.log(`  Created admin user: ${userId}`)
  }

  if (!userId) {
    const [m] = await db
      .select({ userId: member.userId })
      .from(member)
      .where(eq(member.organizationId, ORG_ID))
      .limit(1)
    userId = m?.userId ?? ""
  }

  if (!userId) {
    console.error("  No user found in org. Run `npx tsx scripts/seed.ts` first.")
    process.exit(1)
  }

  console.log(`  Using user: ${userId}, org: ${ORG_ID}`)

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 1: CRM data (companies, contacts, deals, tasks, notes)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n=== Step 1: CRM data ===")

  // Clear existing
  await db.delete(records).where(eq(records.orgId, ORG_ID))
  console.log("  Cleared existing records")

  // Companies
  const companies = [
    { name: "Acme Corp", domain: "acme.com", industry: "Technology", size: "500-1000" },
    { name: "Globex Industries", domain: "globex.io", industry: "Manufacturing", size: "1000-5000" },
    { name: "Initech", domain: "initech.co", industry: "Software", size: "50-200" },
    { name: "Stark Industries", domain: "stark.industries", industry: "Defense & Tech", size: "5000+" },
    { name: "Wayne Enterprises", domain: "wayne.enterprises", industry: "Conglomerate", size: "5000+" },
    { name: "Oscorp", domain: "oscorp.com", industry: "Biotech", size: "1000-5000" },
    { name: "Hooli", domain: "hooli.com", industry: "Technology", size: "1000-5000" },
    { name: "Pied Piper", domain: "pied-piper.com", industry: "Software", size: "10-50" },
    { name: "Raviga Capital", domain: "raviga.vc", industry: "Venture Capital", size: "10-50" },
    { name: "Zenith Labs", domain: "zenith.io", industry: "AI/ML", size: "50-200" },
    { name: "Capsule Corp", domain: "capsule.co", industry: "Hardware", size: "200-500" },
    { name: "Neuralink Systems", domain: "neuralink.dev", industry: "Neuroscience", size: "200-500" },
  ]
  const companyIds: Record<string, string> = {}
  for (let i = 0; i < companies.length; i++) {
    const createdAt = new Date(Date.now() - (90 - i * 7) * 86400000)
    const [row] = await db.insert(records).values({
      orgId: ORG_ID, objectType: "companies", data: companies[i], createdAt, updatedAt: createdAt,
    }).returning()
    companyIds[companies[i].name] = row.id
  }
  console.log(`  ${companies.length} companies`)

  // Contacts
  const contacts = [
    { firstName: "Sarah", lastName: "Chen", email: "sarah.chen@acme.com", phone: "+1-415-555-0101", companyId: companyIds["Acme Corp"], status: "active" },
    { firstName: "Marcus", lastName: "Williams", email: "marcus.w@globex.io", phone: "+1-212-555-0102", companyId: companyIds["Globex Industries"], status: "active" },
    { firstName: "Priya", lastName: "Patel", email: "priya@initech.co", phone: "+1-650-555-0103", companyId: companyIds["Initech"], status: "active" },
    { firstName: "James", lastName: "O'Brien", email: "jobrien@acme.com", phone: "+1-312-555-0104", companyId: companyIds["Acme Corp"], status: "inactive" },
    { firstName: "Aisha", lastName: "Mohammed", email: "aisha.m@stark.industries", phone: "+1-617-555-0105", companyId: companyIds["Stark Industries"], status: "active" },
    { firstName: "David", lastName: "Kim", email: "dkim@wayne.enterprises", phone: "+1-310-555-0106", companyId: companyIds["Wayne Enterprises"], status: "lead" },
    { firstName: "Elena", lastName: "Rodriguez", email: "elena.r@oscorp.com", phone: "+1-718-555-0107", companyId: companyIds["Oscorp"], status: "active" },
    { firstName: "Thomas", lastName: "Andersen", email: "tandersen@globex.io", phone: "+1-202-555-0108", companyId: companyIds["Globex Industries"], status: "lead" },
    { firstName: "Mei", lastName: "Zhang", email: "mei.zhang@capsule.co", phone: "+1-415-555-0109", companyId: companyIds["Capsule Corp"], status: "active" },
    { firstName: "Robert", lastName: "Johnson", email: "rjohnson@hooli.com", phone: "+1-650-555-0110", companyId: companyIds["Hooli"], status: "churned" },
    { firstName: "Lisa", lastName: "Park", email: "lpark@pied-piper.com", phone: "+1-408-555-0111", companyId: companyIds["Pied Piper"], status: "active" },
    { firstName: "Ahmed", lastName: "Hassan", email: "ahmed.h@zenith.io", phone: "+1-510-555-0112", companyId: companyIds["Zenith Labs"], status: "lead" },
    { firstName: "Sophie", lastName: "Dubois", email: "sophie.d@raviga.vc", phone: "+1-415-555-0113", companyId: companyIds["Raviga Capital"], status: "active" },
    { firstName: "Carlos", lastName: "Reyes", email: "creyes@initech.co", phone: "+1-213-555-0114", companyId: companyIds["Initech"], status: "active" },
    { firstName: "Yuki", lastName: "Tanaka", email: "yuki.t@oscorp.com", phone: "+1-646-555-0115", companyId: companyIds["Oscorp"], status: "lead" },
    { firstName: "Rachel", lastName: "Green", email: "rgreen@hooli.com", phone: "+1-212-555-0116", companyId: companyIds["Hooli"], status: "active" },
    { firstName: "Nathan", lastName: "Scott", email: "nscott@acme.com", phone: "+1-570-555-0117", companyId: companyIds["Acme Corp"], status: "active" },
    { firstName: "Fatima", lastName: "Al-Rashid", email: "fatima@zenith.io", phone: "+1-305-555-0118", companyId: companyIds["Zenith Labs"], status: "active" },
    { firstName: "Luke", lastName: "Bennett", email: "lbennett@stark.industries", phone: "+1-512-555-0119", companyId: companyIds["Stark Industries"], status: "inactive" },
    { firstName: "Olivia", lastName: "Chang", email: "ochang@neuralink.dev", phone: "+1-415-555-0120", companyId: companyIds["Neuralink Systems"], status: "active" },
    { firstName: "Daniel", lastName: "Murphy", email: "dmurphy@pied-piper.com", phone: "+1-628-555-0121", companyId: companyIds["Pied Piper"], status: "lead" },
    { firstName: "Ingrid", lastName: "Svensson", email: "ingrid.s@wayne.enterprises", phone: "+1-917-555-0122", companyId: companyIds["Wayne Enterprises"], status: "active" },
    { firstName: "Victor", lastName: "Okoro", email: "vokoro@globex.io", phone: "+1-347-555-0123", companyId: companyIds["Globex Industries"], status: "active" },
    { firstName: "Anna", lastName: "Kowalski", email: "akowalski@capsule.co", phone: "+1-415-555-0124", companyId: companyIds["Capsule Corp"], status: "lead" },
    { firstName: "Ryan", lastName: "Torres", email: "rtorres@raviga.vc", phone: "+1-628-555-0125", companyId: companyIds["Raviga Capital"], status: "active" },
  ]
  for (let i = 0; i < contacts.length; i++) {
    const createdAt = new Date(Date.now() - (60 - i * 2) * 86400000)
    await db.insert(records).values({ orgId: ORG_ID, objectType: "contacts", data: contacts[i], createdAt, updatedAt: createdAt })
  }
  console.log(`  ${contacts.length} contacts`)

  // Deals
  const deals = [
    { name: "Acme Enterprise License", status: "won", amount: 125000, companyId: companyIds["Acme Corp"], closedAt: new Date(Date.now() - 10 * 86400000).toISOString() },
    { name: "Globex Platform Migration", status: "negotiation", amount: 85000, companyId: companyIds["Globex Industries"] },
    { name: "Initech SaaS Rollout", status: "proposal", amount: 42000, companyId: companyIds["Initech"] },
    { name: "Stark Industries POC", status: "discovery", amount: 250000, companyId: companyIds["Stark Industries"] },
    { name: "Wayne Enterprises Renewal", status: "won", amount: 180000, companyId: companyIds["Wayne Enterprises"], closedAt: new Date(Date.now() - 30 * 86400000).toISOString() },
    { name: "Oscorp Research Tools", status: "proposal", amount: 67000, companyId: companyIds["Oscorp"] },
    { name: "Hooli Analytics Bundle", status: "lost", amount: 95000, companyId: companyIds["Hooli"] },
    { name: "Pied Piper Startup Plan", status: "won", amount: 15000, companyId: companyIds["Pied Piper"], closedAt: new Date(Date.now() - 5 * 86400000).toISOString() },
    { name: "Zenith Labs AI Module", status: "negotiation", amount: 110000, companyId: companyIds["Zenith Labs"] },
    { name: "Capsule Corp Hardware Int.", status: "discovery", amount: 55000, companyId: companyIds["Capsule Corp"] },
    { name: "Neuralink Custom Build", status: "proposal", amount: 200000, companyId: companyIds["Neuralink Systems"] },
    { name: "Raviga Portfolio Tool", status: "won", amount: 32000, companyId: companyIds["Raviga Capital"], closedAt: new Date(Date.now() - 45 * 86400000).toISOString() },
  ]
  for (let i = 0; i < deals.length; i++) {
    const createdAt = new Date(Date.now() - (45 - i * 3) * 86400000)
    await db.insert(records).values({ orgId: ORG_ID, objectType: "deals", data: deals[i], createdAt, updatedAt: createdAt })
  }
  console.log(`  ${deals.length} deals`)

  // Tasks
  const tasks = [
    { title: "Follow up with Sarah on Q2 renewal", status: "todo", dueAt: new Date(Date.now() + 3 * 86400000).toISOString() },
    { title: "Send proposal to Stark Industries", status: "in_progress", dueAt: new Date(Date.now() + 1 * 86400000).toISOString() },
    { title: "Review Globex migration timeline", status: "todo", dueAt: new Date(Date.now() + 7 * 86400000).toISOString() },
    { title: "Schedule demo for Oscorp team", status: "done", dueAt: new Date(Date.now() - 2 * 86400000).toISOString() },
    { title: "Update CRM with Hooli loss notes", status: "todo", dueAt: new Date(Date.now() + 2 * 86400000).toISOString() },
    { title: "Prepare board deck for Raviga", status: "done", dueAt: new Date(Date.now() - 5 * 86400000).toISOString() },
    { title: "Onboard Pied Piper account", status: "in_progress", dueAt: new Date(Date.now() + 5 * 86400000).toISOString() },
    { title: "Draft Neuralink SOW", status: "todo", dueAt: new Date(Date.now() + 10 * 86400000).toISOString() },
    { title: "Quarterly pipeline review", status: "todo", dueAt: new Date(Date.now() + 14 * 86400000).toISOString() },
    { title: "Collect testimonial from Wayne Enterprises", status: "in_progress", dueAt: new Date(Date.now() + 4 * 86400000).toISOString() },
  ]
  for (let i = 0; i < tasks.length; i++) {
    const createdAt = new Date(Date.now() - (20 - i * 2) * 86400000)
    await db.insert(records).values({ orgId: ORG_ID, objectType: "tasks", data: tasks[i], createdAt, updatedAt: createdAt })
  }
  console.log(`  ${tasks.length} tasks`)

  // Notes
  const notes = [
    { title: "Acme Q2 strategy call", body: "Sarah mentioned they're expanding to APAC. Key concern is data residency. Follow up with compliance team." },
    { title: "Globex migration requirements", body: "Need SSO integration, custom roles, and audit logging. Marcus wants a phased rollout over 6 weeks." },
    { title: "Competitive intel: Hooli", body: "Hooli chose competitor due to pricing. Their contract is 2 years. Revisit in 18 months." },
    { title: "Pied Piper onboarding checklist", body: "1. API keys provisioned\n2. Sandbox environment set up\n3. Training session scheduled for next Tuesday\n4. Documentation shared" },
    { title: "Stark Industries discovery notes", body: "Massive opportunity. They need workflow automation across 12 departments. Budget approved for Q3. Key stakeholder: Aisha Mohammed." },
    { title: "Weekly standup notes - Mar 25", body: "Pipeline at $1.2M. 4 deals in negotiation. Focus this week: close Zenith Labs and send Neuralink SOW." },
  ]
  for (let i = 0; i < notes.length; i++) {
    const createdAt = new Date(Date.now() - (15 - i * 2) * 86400000)
    await db.insert(records).values({ orgId: ORG_ID, objectType: "notes", data: notes[i], createdAt, updatedAt: createdAt })
  }
  console.log(`  ${notes.length} notes`)

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 2: Workflows
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n=== Step 2: Workflows ===")

  // Clear existing
  const existingWfs = await db.select({ id: workflows.id }).from(workflows).where(eq(workflows.orgId, ORG_ID))
  for (const wf of existingWfs) {
    await db.delete(workflows).where(eq(workflows.id, wf.id))
  }
  console.log(`  Cleared ${existingWfs.length} existing workflow(s)`)

  async function createWorkflow(
    name: string, description: string, color: string,
    blocks: Array<{ id: string; type: string; name: string; x: number; y: number; subBlocks?: Record<string, unknown>; data?: Record<string, unknown>; enabled?: boolean; triggerMode?: boolean }>,
    edges: Array<{ source: string; target: string; sourceHandle?: string; targetHandle?: string }>
  ) {
    const [wf] = await db.insert(workflows).values({ orgId: ORG_ID, userId, name, description, color }).returning()
    if (blocks.length > 0) {
      await db.insert(workflowBlocks).values(blocks.map((b) => ({
        id: b.id as any, workflowId: wf.id, type: b.type, name: b.name,
        positionX: String(b.x), positionY: String(b.y),
        enabled: b.enabled ?? true, triggerMode: b.triggerMode ?? false,
        horizontalHandles: true, subBlocks: b.subBlocks ?? {}, outputs: {}, data: b.data ?? {},
      })))
    }
    if (edges.length > 0) {
      await db.insert(workflowEdges).values(edges.map((e) => ({
        workflowId: wf.id,
        sourceBlockId: e.source as any, targetBlockId: e.target as any,
        sourceHandle: e.sourceHandle ?? "source", targetHandle: e.targetHandle ?? "target",
      })))
    }
    console.log(`  "${name}" (${blocks.length} blocks, ${edges.length} edges)`)
    return wf
  }

  // IDs
  const W1_START = "10000000-0001-0001-0001-000000000001"
  const W1_AGENT = "10000000-0001-0001-0001-000000000002"
  const W1_FUNC = "10000000-0001-0001-0001-000000000003"

  const W2_START = "20000000-0002-0002-0002-000000000001"
  const W2_API = "20000000-0002-0002-0002-000000000002"
  const W2_AGENT = "20000000-0002-0002-0002-000000000003"
  const W2_COND = "20000000-0002-0002-0002-000000000004"
  const W2_YES = "20000000-0002-0002-0002-000000000005"
  const W2_NO = "20000000-0002-0002-0002-000000000006"

  const W3_WEBHOOK = "50000000-0005-0005-0005-000000000001"
  const W3_FUNC = "50000000-0005-0005-0005-000000000002"
  const W3_API = "50000000-0005-0005-0005-000000000003"

  const W4_START = "60000000-0006-0006-0006-000000000001"

  // 1. Simple Agent Pipeline
  await createWorkflow("Simple Agent Pipeline",
    "Start → LLM agent → JS function. Tests basic block chaining and tag references.", "#3B82F6",
    [
      { id: W1_START, type: "start_trigger", name: "Start Trigger", x: 100, y: 300 },
      { id: W1_AGENT, type: "agent", name: "Summarizer", x: 450, y: 300, subBlocks: {
        model: { value: "basics-chat-smart-openai" },
        messages: { value: [
          { role: "system", content: "You are a concise summarizer. Summarize the user input in 2-3 sentences." },
          { role: "user", content: "<Start Trigger.input>" },
        ]},
        temperature: { value: 0.3 },
      }},
      { id: W1_FUNC, type: "function", name: "Word Counter", x: 800, y: 300, subBlocks: {
        code: { value: "const summary = <Summarizer.content>;\nconst wordCount = summary.split(/\\\\s+/).filter(Boolean).length;\nreturn { summary, wordCount, charCount: summary.length, timestamp: new Date().toISOString() };" },
      }},
    ],
    [{ source: W1_START, target: W1_AGENT }, { source: W1_AGENT, target: W1_FUNC }]
  )

  // 2. API Data Analyzer (with fixed condition)
  const condIfId = `${W2_COND}-if`
  const condElseId = `${W2_COND}-else`
  await createWorkflow("API Data Analyzer",
    "Fetches a public API, analyzes with an agent, branches on condition.", "#8B5CF6",
    [
      { id: W2_START, type: "start_trigger", name: "Start", x: 50, y: 300 },
      { id: W2_API, type: "api", name: "Fetch Data", x: 350, y: 300, subBlocks: {
        url: { value: "https://jsonplaceholder.typicode.com/posts/1" },
        method: { value: "GET" },
        headers: { value: [["Content-Type", "application/json"]] },
      }},
      { id: W2_AGENT, type: "agent", name: "Analyzer", x: 700, y: 300, subBlocks: {
        model: { value: "basics-chat-smart-openai" },
        messages: { value: [
          { role: "system", content: 'Analyze the following API response. Reply with EXACTLY "positive" if the content seems constructive, or "negative" otherwise. Just one word.' },
          { role: "user", content: "<Fetch Data.data>" },
        ]},
        temperature: { value: 0 },
      }},
      { id: W2_COND, type: "condition", name: "Check Sentiment", x: 1050, y: 300, subBlocks: {
        conditions: { value: JSON.stringify([
          { id: condIfId, title: "if", value: '<Analyzer.content>.toLowerCase().includes("positive")' },
          { id: condElseId, title: "else", value: "" },
        ])},
      }},
      { id: W2_YES, type: "function", name: "Positive Path", x: 1400, y: 150, subBlocks: {
        code: { value: 'return { result: "Content is positive!", analysis: <Analyzer.content> };' },
      }},
      { id: W2_NO, type: "function", name: "Negative Path", x: 1400, y: 450, subBlocks: {
        code: { value: 'return { result: "Content is negative or neutral.", analysis: <Analyzer.content> };' },
      }},
    ],
    [
      { source: W2_START, target: W2_API },
      { source: W2_API, target: W2_AGENT },
      { source: W2_AGENT, target: W2_COND },
      { source: W2_COND, target: W2_YES, sourceHandle: `condition-${condIfId}` },
      { source: W2_COND, target: W2_NO, sourceHandle: `condition-${condElseId}` },
    ]
  )

  // 3. Webhook Processor
  await createWorkflow("Webhook Processor",
    "Receives a webhook, transforms with a function, posts to an external API.", "#F59E0B",
    [
      { id: W3_WEBHOOK, type: "generic_webhook", name: "Webhook Trigger", x: 100, y: 300, triggerMode: true },
      { id: W3_FUNC, type: "function", name: "Transform", x: 500, y: 300, subBlocks: {
        code: { value: 'const raw = <Webhook Trigger.data>;\nconst payload = typeof raw === "string" ? JSON.parse(raw) : raw;\nreturn { event: "webhook_received", processed_at: new Date().toISOString(), payload_keys: Object.keys(payload), transformed: true };' },
      }},
      { id: W3_API, type: "api", name: "Post Result", x: 900, y: 300, subBlocks: {
        url: { value: "https://httpbin.org/post" },
        method: { value: "POST" },
        headers: { value: [["Content-Type", "application/json"]] },
        body: { value: "<Transform.result>" },
      }},
    ],
    [
      { source: W3_WEBHOOK, target: W3_FUNC },
      { source: W3_FUNC, target: W3_API },
    ]
  )

  // 4. Copilot Playground (empty — for testing copilot)
  await createWorkflow("Copilot Playground",
    "Empty workflow — use the copilot to build it from scratch.", "#22C55E",
    [{ id: W4_START, type: "start_trigger", name: "Start", x: 300, y: 300 }],
    []
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // Done
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n=== Done ===")
  console.log("  12 companies, 25 contacts, 12 deals, 10 tasks, 6 notes")
  console.log("  4 workflows (agent pipeline, API analyzer, webhook processor, copilot playground)")
  console.log("\n  Login: admin@example.com / admin123")
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
