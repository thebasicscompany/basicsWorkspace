/**
 * Seed script: deletes all existing workflows, then creates showcase workflows
 * that exercise every feature built so far.
 *
 * Usage: npx tsx scripts/seed-workflows.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

const SEED_ORG_ID = 'org_seed_default'

async function seed() {
  const { db } = await import('../lib/db')
  const { workflows, workflowBlocks, workflowEdges, workflowExecutionLogs } = await import(
    '../lib/db/schema/workflows'
  )
  const { eq } = await import('drizzle-orm')
  const { member } = await import('../lib/db/schema')

  // Get the admin user from the org
  const [m] = await db
    .select({ userId: member.userId })
    .from(member)
    .where(eq(member.organizationId, SEED_ORG_ID))
    .limit(1)

  if (!m) {
    console.error('No user found in org. Run `npx tsx scripts/seed.ts` first.')
    process.exit(1)
  }
  const userId = m.userId
  console.log(`Using user: ${userId}`)

  // ─── Delete all existing workflows (cascade deletes blocks/edges/logs) ────
  const existing = await db
    .select({ id: workflows.id })
    .from(workflows)
    .where(eq(workflows.orgId, SEED_ORG_ID))

  for (const wf of existing) {
    await db.delete(workflows).where(eq(workflows.id, wf.id))
  }
  console.log(`Deleted ${existing.length} existing workflow(s)`)

  // ─── Helper ───────────────────────────────────────────────────────────────
  async function createWorkflow(
    name: string,
    description: string,
    color: string,
    blocks: Array<{
      id: string
      type: string
      name: string
      x: number
      y: number
      subBlocks?: Record<string, unknown>
      data?: Record<string, unknown>
      enabled?: boolean
      triggerMode?: boolean
    }>,
    edges: Array<{
      source: string
      target: string
      sourceHandle?: string
      targetHandle?: string
    }>
  ) {
    const [wf] = await db
      .insert(workflows)
      .values({
        orgId: SEED_ORG_ID,
        userId,
        name,
        description,
        color,
      })
      .returning()

    if (blocks.length > 0) {
      await db.insert(workflowBlocks).values(
        blocks.map((b) => ({
          id: b.id as `${string}-${string}-${string}-${string}-${string}`,
          workflowId: wf.id,
          type: b.type,
          name: b.name,
          positionX: String(b.x),
          positionY: String(b.y),
          enabled: b.enabled ?? true,
          triggerMode: b.triggerMode ?? false,
          horizontalHandles: true,
          subBlocks: b.subBlocks ?? {},
          outputs: {},
          data: b.data ?? {},
        }))
      )
    }

    if (edges.length > 0) {
      await db.insert(workflowEdges).values(
        edges.map((e) => ({
          workflowId: wf.id,
          sourceBlockId: e.source as `${string}-${string}-${string}-${string}-${string}`,
          targetBlockId: e.target as `${string}-${string}-${string}-${string}-${string}`,
          sourceHandle: e.sourceHandle ?? 'source',
          targetHandle: e.targetHandle ?? 'target',
        }))
      )
    }

    console.log(`  Created: "${name}" (${blocks.length} blocks, ${edges.length} edges)`)
    return wf
  }

  // ─── Block IDs (stable UUIDs for edge references) ─────────────────────────
  // Workflow 1: Simple Agent Pipeline
  const W1_START = '10000000-0001-0001-0001-000000000001'
  const W1_AGENT = '10000000-0001-0001-0001-000000000002'
  const W1_FUNC = '10000000-0001-0001-0001-000000000003'

  // Workflow 2: API → Agent → Condition
  const W2_START = '20000000-0002-0002-0002-000000000001'
  const W2_API = '20000000-0002-0002-0002-000000000002'
  const W2_AGENT = '20000000-0002-0002-0002-000000000003'
  const W2_COND = '20000000-0002-0002-0002-000000000004'
  const W2_YES = '20000000-0002-0002-0002-000000000005'
  const W2_NO = '20000000-0002-0002-0002-000000000006'

  // Workflow 3: Multi-Agent with Router
  const W3_START = '30000000-0003-0003-0003-000000000001'
  const W3_ROUTER = '30000000-0003-0003-0003-000000000002'
  const W3_WRITER = '30000000-0003-0003-0003-000000000003'
  const W3_CODER = '30000000-0003-0003-0003-000000000004'
  const W3_ANALYST = '30000000-0003-0003-0003-000000000005'
  const W3_OUTPUT = '30000000-0003-0003-0003-000000000006'

  // Workflow 4: Gmail Draft (OAuth showcase)
  const W4_START = '40000000-0004-0004-0004-000000000001'
  const W4_AGENT = '40000000-0004-0004-0004-000000000002'
  const W4_GMAIL = '40000000-0004-0004-0004-000000000003'

  // Workflow 5: Webhook → Function → API
  const W5_WEBHOOK = '50000000-0005-0005-0005-000000000001'
  const W5_FUNC = '50000000-0005-0005-0005-000000000002'
  const W5_API = '50000000-0005-0005-0005-000000000003'

  // Workflow 6: Empty (for copilot testing)
  // no blocks

  console.log('\nSeeding workflows...\n')

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Simple Agent Pipeline — Start → Agent → Function
  // ═══════════════════════════════════════════════════════════════════════════
  await createWorkflow(
    'Simple Agent Pipeline',
    'Start trigger → LLM agent → JS function that processes the output. Tests basic block chaining and tag references.',
    '#3B82F6',
    [
      {
        id: W1_START,
        type: 'start_trigger',
        name: 'Start Trigger',
        x: 100,
        y: 300,
      },
      {
        id: W1_AGENT,
        type: 'agent',
        name: 'Summarizer',
        x: 450,
        y: 300,
        subBlocks: {
          model: { value: 'basics-chat-smart-openai' },
          messages: {
            value: [
              {
                role: 'system',
                content: 'You are a concise summarizer. Summarize the user input in 2-3 sentences.',
              },
              { role: 'user', content: '<Start Trigger.input>' },
            ],
          },
          temperature: { value: 0.3 },
        },
      },
      {
        id: W1_FUNC,
        type: 'function',
        name: 'Word Counter',
        x: 800,
        y: 300,
        subBlocks: {
          code: {
            value: `// Count words in the summary
const summary = <Summarizer.content>;
const wordCount = summary.split(/\\s+/).filter(Boolean).length;
return {
  summary,
  wordCount,
  charCount: summary.length,
  timestamp: new Date().toISOString()
};`,
          },
        },
      },
    ],
    [
      { source: W1_START, target: W1_AGENT },
      { source: W1_AGENT, target: W1_FUNC },
    ]
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. API + Condition — Fetch data, analyze, branch
  // ═══════════════════════════════════════════════════════════════════════════
  await createWorkflow(
    'API Data Analyzer',
    'Fetches a public API, uses an agent to analyze the response, then branches on a condition. Tests API blocks, tag references, and condition routing.',
    '#8B5CF6',
    [
      {
        id: W2_START,
        type: 'start_trigger',
        name: 'Start',
        x: 50,
        y: 300,
      },
      {
        id: W2_API,
        type: 'api',
        name: 'Fetch Data',
        x: 350,
        y: 300,
        subBlocks: {
          url: { value: 'https://jsonplaceholder.typicode.com/posts/1' },
          method: { value: 'GET' },
          headers: { value: [['Content-Type', 'application/json']] },
        },
      },
      {
        id: W2_AGENT,
        type: 'agent',
        name: 'Analyzer',
        x: 700,
        y: 300,
        subBlocks: {
          model: { value: 'basics-chat-smart-openai' },
          messages: {
            value: [
              {
                role: 'system',
                content:
                  'Analyze the following API response. Reply with EXACTLY "positive" if the content seems constructive, or "negative" otherwise. Just one word.',
              },
              { role: 'user', content: '<Fetch Data.data>' },
            ],
          },
          temperature: { value: 0 },
        },
      },
      {
        id: W2_COND,
        type: 'condition',
        name: 'Check Sentiment',
        x: 1050,
        y: 300,
        subBlocks: {
          conditions: {
            value: [
              {
                id: 'cond1',
                field: '<Analyzer.content>',
                operator: 'contains',
                value: 'positive',
              },
            ],
          },
        },
      },
      {
        id: W2_YES,
        type: 'function',
        name: 'Positive Path',
        x: 1400,
        y: 150,
        subBlocks: {
          code: {
            value: 'return { result: "Content is positive!", analysis: <Analyzer.content> };',
          },
        },
      },
      {
        id: W2_NO,
        type: 'function',
        name: 'Negative Path',
        x: 1400,
        y: 450,
        subBlocks: {
          code: {
            value:
              'return { result: "Content is negative or neutral.", analysis: <Analyzer.content> };',
          },
        },
      },
    ],
    [
      { source: W2_START, target: W2_API },
      { source: W2_API, target: W2_AGENT },
      { source: W2_AGENT, target: W2_COND },
      { source: W2_COND, target: W2_YES, sourceHandle: 'condition-cond1' },
      { source: W2_COND, target: W2_NO, sourceHandle: 'condition-default' },
    ]
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Multi-Agent with Router — Routes input to specialist agents
  // ═══════════════════════════════════════════════════════════════════════════
  await createWorkflow(
    'Multi-Agent Router',
    'Uses a router block to classify input and send it to the right specialist agent (writer, coder, or analyst). Tests router blocks with multiple output handles.',
    '#EC4899',
    [
      {
        id: W3_START,
        type: 'start_trigger',
        name: 'Start',
        x: 50,
        y: 350,
      },
      {
        id: W3_ROUTER,
        type: 'router',
        name: 'Task Router',
        x: 400,
        y: 350,
        subBlocks: {
          context: {
            value: 'Classify the following request: "Write me a blog post about the future of AI agents in software development"',
          },
          routes: {
            value: [
              { id: 'route-writing', value: 'Writing tasks — essays, emails, creative content' },
              { id: 'route-coding', value: 'Coding tasks — programming, debugging, code review' },
              { id: 'route-analysis', value: 'Analysis tasks — data analysis, research, insights' },
            ],
          },
          model: { value: 'basics-chat-smart-openai' },
        },
      },
      {
        id: W3_WRITER,
        type: 'agent',
        name: 'Writer Agent',
        x: 850,
        y: 100,
        subBlocks: {
          model: { value: 'basics-chat-smart-openai' },
          messages: {
            value: [
              { role: 'system', content: 'You are a professional writer. Help with the writing task.' },
              { role: 'user', content: 'Write me a blog post about the future of AI agents in software development' },
            ],
          },
          temperature: { value: 0.7 },
        },
      },
      {
        id: W3_CODER,
        type: 'agent',
        name: 'Coder Agent',
        x: 850,
        y: 350,
        subBlocks: {
          model: { value: 'basics-chat-smart-openai' },
          messages: {
            value: [
              { role: 'system', content: 'You are an expert programmer. Write clean, well-documented code.' },
              { role: 'user', content: 'Write me a blog post about the future of AI agents in software development' },
            ],
          },
          temperature: { value: 0.2 },
        },
      },
      {
        id: W3_ANALYST,
        type: 'agent',
        name: 'Analyst Agent',
        x: 850,
        y: 600,
        subBlocks: {
          model: { value: 'basics-chat-smart-openai' },
          messages: {
            value: [
              {
                role: 'system',
                content: 'You are a data analyst. Provide structured analysis with key insights.',
              },
              { role: 'user', content: 'Write me a blog post about the future of AI agents in software development' },
            ],
          },
          temperature: { value: 0.3 },
        },
      },
      {
        id: W3_OUTPUT,
        type: 'function',
        name: 'Format Output',
        x: 1250,
        y: 350,
        subBlocks: {
          code: {
            value: `// Tags resolve to the output of whichever agent ran (others will be empty)
const writer = <Writer Agent.content>;
const coder = <Coder Agent.content>;
const analyst = <Analyst Agent.content>;
const result = writer || coder || analyst || "No agent output";
return { response: result };`,
          },
        },
      },
    ],
    [
      { source: W3_START, target: W3_ROUTER },
      { source: W3_ROUTER, target: W3_WRITER, sourceHandle: 'router-route-writing' },
      { source: W3_ROUTER, target: W3_CODER, sourceHandle: 'router-route-coding' },
      { source: W3_ROUTER, target: W3_ANALYST, sourceHandle: 'router-route-analysis' },
      { source: W3_WRITER, target: W3_OUTPUT },
      { source: W3_CODER, target: W3_OUTPUT },
      { source: W3_ANALYST, target: W3_OUTPUT },
    ]
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Gmail Draft — Agent generates email, Gmail block creates draft (OAuth)
  // ═══════════════════════════════════════════════════════════════════════════
  await createWorkflow(
    'Gmail Draft Writer',
    'Agent writes a professional email based on input, then creates a Gmail draft. Requires Gmail OAuth — tests the OAuth credential flow.',
    '#EF4444',
    [
      {
        id: W4_START,
        type: 'start_trigger',
        name: 'Start',
        x: 100,
        y: 300,
      },
      {
        id: W4_AGENT,
        type: 'agent',
        name: 'Email Writer',
        x: 450,
        y: 300,
        subBlocks: {
          model: { value: 'basics-chat-smart-openai' },
          messages: {
            value: [
              {
                role: 'system',
                content: `You are a professional email writer. Given a topic and recipient, write a clear, polite email.
Respond with ONLY a JSON object (no markdown, no code fences):
{"subject": "...", "body": "...", "to": "..."}`,
              },
              { role: 'user', content: '<Start.input>' },
            ],
          },
          temperature: { value: 0.5 },
          responseFormat: {
            value: JSON.stringify({
              type: 'json_schema',
              json_schema: {
                name: 'email',
                schema: {
                  type: 'object',
                  properties: {
                    subject: { type: 'string' },
                    body: { type: 'string' },
                    to: { type: 'string' },
                  },
                  required: ['subject', 'body', 'to'],
                },
              },
            }),
          },
        },
      },
      {
        id: W4_GMAIL,
        type: 'gmail',
        name: 'Create Draft',
        x: 850,
        y: 300,
        subBlocks: {
          operation: { value: 'create_draft' },
          to: { value: '<Email Writer.content>' },
          subject: { value: 'Draft from Basics OS' },
          body: { value: '<Email Writer.content>' },
          contentType: { value: 'text' },
          // credential will be empty — user needs to connect Gmail OAuth
          credential: { value: '' },
        },
      },
    ],
    [
      { source: W4_START, target: W4_AGENT },
      { source: W4_AGENT, target: W4_GMAIL },
    ]
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Webhook → Function → API — External trigger workflow
  // ═══════════════════════════════════════════════════════════════════════════
  await createWorkflow(
    'Webhook Processor',
    'Receives a webhook payload, transforms it with a function, then POSTs to an external API. Tests the webhook trigger type and data transformation.',
    '#F59E0B',
    [
      {
        id: W5_WEBHOOK,
        type: 'generic_webhook',
        name: 'Webhook Trigger',
        x: 100,
        y: 300,
        triggerMode: true,
      },
      {
        id: W5_FUNC,
        type: 'function',
        name: 'Transform',
        x: 500,
        y: 300,
        subBlocks: {
          code: {
            value: `// Transform webhook payload
const raw = <Webhook Trigger.data>;
const payload = typeof raw === "string" ? JSON.parse(raw) : raw;
return {
  event: "webhook_received",
  processed_at: new Date().toISOString(),
  payload_keys: Object.keys(payload),
  transformed: true
};`,
          },
        },
      },
      {
        id: W5_API,
        type: 'api',
        name: 'Notify API',
        x: 900,
        y: 300,
        subBlocks: {
          url: { value: 'https://httpbin.org/post' },
          method: { value: 'POST' },
          headers: { value: [['Content-Type', 'application/json']] },
          body: { value: '<Transform.result>' },
        },
      },
    ],
    [
      { source: W5_WEBHOOK, target: W5_FUNC },
      { source: W5_FUNC, target: W5_API },
    ]
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. Empty Workflow — For copilot testing (ask copilot to build something)
  // ═══════════════════════════════════════════════════════════════════════════
  await createWorkflow(
    'Copilot Playground',
    'An empty workflow for testing the copilot. Open this and ask the copilot to build a workflow for you.',
    '#2563EB',
    [],
    []
  )

  // ─── Seed some execution logs for workflow 1 ──────────────────────────────
  const wf1 = await db
    .select({ id: workflows.id })
    .from(workflows)
    .where(eq(workflows.name, 'Simple Agent Pipeline'))
    .limit(1)

  if (wf1[0]) {
    const wfId = wf1[0].id
    const now = Date.now()

    await db.insert(workflowExecutionLogs).values([
      {
        workflowId: wfId,
        orgId: SEED_ORG_ID,
        status: 'success',
        trigger: 'manual',
        startedAt: new Date(now - 3600000),
        endedAt: new Date(now - 3600000 + 2500),
        totalDurationMs: 2500,
        executionData: [
          {
            blockId: W1_START,
            blockName: 'Start Trigger',
            blockType: 'start_trigger',
            success: true,
            durationMs: 5,
            output: { input: 'Summarize the history of JavaScript.' },
          },
          {
            blockId: W1_AGENT,
            blockName: 'Summarizer',
            blockType: 'agent',
            success: true,
            durationMs: 1800,
            output: {
              content:
                'JavaScript was created by Brendan Eich in 1995 at Netscape. It evolved from a simple scripting language to a powerful platform powering both frontend and backend development.',
            },
          },
          {
            blockId: W1_FUNC,
            blockName: 'Word Counter',
            blockType: 'function',
            success: true,
            durationMs: 12,
            output: { result: { wordCount: 27, charCount: 168 } },
          },
        ],
      },
      {
        workflowId: wfId,
        orgId: SEED_ORG_ID,
        status: 'error',
        trigger: 'manual',
        startedAt: new Date(now - 7200000),
        endedAt: new Date(now - 7200000 + 500),
        totalDurationMs: 500,
        executionData: [
          {
            blockId: W1_START,
            blockName: 'Start Trigger',
            blockType: 'start_trigger',
            success: true,
            durationMs: 3,
            output: { input: '' },
          },
          {
            blockId: W1_AGENT,
            blockName: 'Summarizer',
            blockType: 'agent',
            success: false,
            durationMs: 480,
            error: 'Empty input provided',
          },
        ],
      },
      {
        workflowId: wfId,
        orgId: SEED_ORG_ID,
        status: 'success',
        trigger: 'manual',
        startedAt: new Date(now - 1800000),
        endedAt: new Date(now - 1800000 + 3200),
        totalDurationMs: 3200,
        executionData: [
          {
            blockId: W1_START,
            blockName: 'Start Trigger',
            blockType: 'start_trigger',
            success: true,
            durationMs: 4,
            output: { input: 'Explain quantum computing in simple terms.' },
          },
          {
            blockId: W1_AGENT,
            blockName: 'Summarizer',
            blockType: 'agent',
            success: true,
            durationMs: 2800,
            output: {
              content:
                'Quantum computing uses quantum bits that can be 0 and 1 simultaneously. This allows quantum computers to solve certain problems exponentially faster than classical computers.',
            },
          },
          {
            blockId: W1_FUNC,
            blockName: 'Word Counter',
            blockType: 'function',
            success: true,
            durationMs: 8,
            output: { result: { wordCount: 25, charCount: 175 } },
          },
        ],
      },
    ])
    console.log('\n  Seeded 3 execution logs for "Simple Agent Pipeline"')
  }

  console.log('\nDone! 6 workflows seeded.\n')
  console.log('Workflows to test:')
  console.log('  1. Simple Agent Pipeline    — Start → Agent → Function (basic chaining)')
  console.log('  2. API Data Analyzer        — API → Agent → Condition branching')
  console.log('  3. Multi-Agent Router       — Router → 3 specialist agents → merge')
  console.log('  4. Gmail Draft Writer       — Agent → Gmail (OAuth credential flow)')
  console.log('  5. Webhook Processor        — Webhook → Function → API (trigger mode)')
  console.log('  6. Copilot Playground       — Empty workflow for copilot testing')

  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
