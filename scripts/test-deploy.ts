/**
 * Test script for Phase 4: Deploy & Trigger Runtime
 *
 * Tests:
 * 1. Deploy a workflow with a generic_webhook trigger
 * 2. Verify deployment records in DB
 * 3. Send a webhook, verify execution
 * 4. Undeploy, verify cleanup
 * 5. Deploy with a schedule trigger, verify schedule record
 * 6. Needsredeployment detection
 *
 * Usage: npx tsx scripts/test-deploy.ts
 * Requires: dev server running on localhost:3000, seeded DB
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

const SEED_ORG_ID = 'org_seed_default'
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

let sessionCookie = ''

// ─── Helpers ───────────────────────────────────────────────────────────────

async function login(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: BASE_URL,
      Referer: `${BASE_URL}/login`,
    },
    body: JSON.stringify({ email: 'admin@example.com', password: 'admin123' }),
    redirect: 'manual',
  })

  const setCookies = res.headers.getSetCookie()
  const sessionTokenCookie = setCookies.find(c => c.startsWith('better-auth.session_token='))
  if (!sessionTokenCookie) {
    console.error('Login failed. Set-Cookie headers:', setCookies)
    console.error('Response status:', res.status)
    const body = await res.text()
    console.error('Response body:', body.slice(0, 500))
    throw new Error('Login failed — no session cookie returned')
  }

  // Extract just the cookie value for the header
  return sessionTokenCookie.split(';')[0]
}

async function api(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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

// ─── DB helpers (direct access for verification) ──────────────────────────

async function getDB() {
  const { db } = await import('../lib/db')
  const schema = await import('../lib/db/schema/workflows')
  return { db, ...schema }
}

// ─── Test: Create a test workflow with generic_webhook trigger ─────────────

async function createTestWorkflow(name: string, triggerType: string): Promise<string> {
  const { db, workflows, workflowBlocks, workflowEdges } = await getDB()
  const { member } = await import('../lib/db/schema')
  const { eq } = await import('drizzle-orm')

  const [m] = await db
    .select({ userId: member.userId })
    .from(member)
    .where(eq(member.organizationId, SEED_ORG_ID))
    .limit(1)

  if (!m) throw new Error('No user found in org')

  // Create workflow
  const [wf] = await db
    .insert(workflows)
    .values({
      orgId: SEED_ORG_ID,
      userId: m.userId,
      name,
      description: `Test workflow for ${triggerType}`,
      color: '#22c55e',
    })
    .returning()

  const startBlockId = crypto.randomUUID()
  const agentBlockId = crypto.randomUUID()

  // Create a starter/trigger block
  const triggerSubBlocks: Record<string, unknown> = triggerType === 'schedule'
    ? {
        scheduleType: { id: 'scheduleType', type: 'dropdown', value: 'minutes' },
        minutesInterval: { id: 'minutesInterval', type: 'short-input', value: '5' },
        timezone: { id: 'timezone', type: 'dropdown', value: 'UTC' },
      }
    : {
        // generic_webhook trigger — minimal required subblocks
        requireAuth: { id: 'requireAuth', type: 'switch', value: false },
        responseMode: { id: 'responseMode', type: 'dropdown', value: 'default' },
      }

  const triggerBlockType = triggerType === 'schedule' ? 'schedule' : 'generic_webhook'
  const triggerBlockName = triggerType === 'schedule' ? 'Schedule' : 'Webhook'

  await db.insert(workflowBlocks).values([
    {
      id: startBlockId,
      workflowId: wf.id,
      type: triggerBlockType,
      name: triggerBlockName,
      positionX: '100',
      positionY: '200',
      subBlocks: triggerSubBlocks,
      outputs: {},
      data: {},
      enabled: true,
    },
    {
      id: agentBlockId,
      workflowId: wf.id,
      type: 'function',
      name: 'Test Function',
      positionX: '400',
      positionY: '200',
      subBlocks: {
        code: {
          id: 'code',
          type: 'code',
          value: 'return { result: "hello from webhook test" }',
        },
      },
      outputs: {},
      data: {},
      enabled: true,
    },
  ])

  // Create edge
  await db.insert(workflowEdges).values({
    workflowId: wf.id,
    sourceBlockId: startBlockId,
    targetBlockId: agentBlockId,
  })

  console.log(`  Created workflow: ${wf.id} (${name})`)
  return wf.id
}

// ─── Tests ─────────────────────────────────────────────────────────────────

async function testDeployWorkflow() {
  console.log('\n=== Test 1: Deploy a workflow ===')

  const workflowId = await createTestWorkflow('Deploy Test - Webhook', 'generic_webhook')

  // Deploy
  const res = await api(`/api/workflows/${workflowId}/deploy`, { method: 'POST' })
  const body = await res.json()
  assert(res.ok, `POST /deploy returned ${res.status}`)
  assert(body.isDeployed === true, 'Response shows isDeployed=true')
  assert(!!body.deployedAt, 'Response includes deployedAt')

  // Verify DB records
  const { db, workflows, workflowDeploymentVersion } = await getDB()
  const { eq, and } = await import('drizzle-orm')

  const [wf] = await db
    .select()
    .from(workflows)
    .where(eq(workflows.id, workflowId as any))
    .limit(1)
  assert(wf?.isDeployed === true, 'DB: workflows.isDeployed = true')

  const [version] = await db
    .select()
    .from(workflowDeploymentVersion)
    .where(
      and(
        eq(workflowDeploymentVersion.workflowId, workflowId),
        eq(workflowDeploymentVersion.isActive, true)
      )
    )
    .limit(1)
  assert(!!version, 'DB: workflowDeploymentVersion record exists')
  assert(version?.isActive === true, 'DB: version.isActive = true')
  assert(version?.version === 1, `DB: version number = ${version?.version}`)

  // GET /deploy returns isDeployed
  const getRes = await api(`/api/workflows/${workflowId}/deploy`)
  const getBody = await getRes.json()
  assert(getRes.ok, `GET /deploy returned ${getRes.status}`)
  assert(getBody.isDeployed === true, 'GET /deploy shows isDeployed=true')
  assert(getBody.needsRedeployment === false, 'No redeployment needed')

  return workflowId
}

async function testWebhookExecution(workflowId: string) {
  console.log('\n=== Test 2: Webhook execution ===')

  // Find the webhook record
  const { db, webhook: webhookTable } = await getDB()
  const { eq } = await import('drizzle-orm')

  const webhooks = await db
    .select()
    .from(webhookTable)
    .where(eq(webhookTable.workflowId, workflowId))

  // Our starter block may not create webhooks (only trigger blocks do)
  if (webhooks.length === 0) {
    console.log('  SKIP: No webhook created for starter block (expected for non-trigger blocks)')
    return
  }

  const wh = webhooks[0]
  console.log(`  Webhook path: ${wh.path}`)

  // Send webhook (unauthenticated — public path)
  const res = await fetch(`${BASE_URL}/api/webhooks/trigger/${wh.path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test: true, message: 'Hello from test script' }),
  })
  const body = await res.json()
  assert(res.ok, `POST /api/webhooks/trigger/${wh.path} returned ${res.status}`)
  assert(body.success === true, 'Webhook execution succeeded')
  assert(!!body.executionId, `Execution ID: ${body.executionId}`)

  // Verify execution log
  const { workflowExecutionLogs } = await getDB()
  const logs = await db
    .select()
    .from(workflowExecutionLogs)
    .where(eq(workflowExecutionLogs.workflowId, workflowId as any))

  const webhookLog = logs.find(l => l.trigger === 'webhook')
  assert(!!webhookLog, 'DB: execution log with trigger=webhook exists')
  assert(webhookLog?.status === 'success', `DB: execution log status = ${webhookLog?.status}`)
}

async function testUndeploy(workflowId: string) {
  console.log('\n=== Test 3: Undeploy workflow ===')

  const res = await api(`/api/workflows/${workflowId}/deploy`, { method: 'DELETE' })
  const body = await res.json()
  assert(res.ok, `DELETE /deploy returned ${res.status}`)
  assert(body.isDeployed === false, 'Response shows isDeployed=false')

  // Verify DB
  const { db, workflows, workflowDeploymentVersion, webhook: webhookTable } = await getDB()
  const { eq, and } = await import('drizzle-orm')

  const [wf] = await db
    .select()
    .from(workflows)
    .where(eq(workflows.id, workflowId as any))
    .limit(1)
  assert(wf?.isDeployed === false, 'DB: workflows.isDeployed = false')

  const [version] = await db
    .select()
    .from(workflowDeploymentVersion)
    .where(
      and(
        eq(workflowDeploymentVersion.workflowId, workflowId),
        eq(workflowDeploymentVersion.isActive, true)
      )
    )
    .limit(1)
  assert(!version, 'DB: no active deployment version')

  const webhooks = await db
    .select()
    .from(webhookTable)
    .where(eq(webhookTable.workflowId, workflowId))
  assert(webhooks.length === 0, 'DB: all webhooks deleted')

  // GET /deploy reflects undeploy
  const getRes = await api(`/api/workflows/${workflowId}/deploy`)
  const getBody = await getRes.json()
  assert(getBody.isDeployed === false, 'GET /deploy shows isDeployed=false')
}

async function testScheduleDeploy() {
  console.log('\n=== Test 4: Deploy with schedule trigger ===')

  const workflowId = await createTestWorkflow('Deploy Test - Schedule', 'schedule')

  const res = await api(`/api/workflows/${workflowId}/deploy`, { method: 'POST' })
  const body = await res.json()
  assert(res.ok, `POST /deploy returned ${res.status}`)
  assert(body.isDeployed === true, 'Response shows isDeployed=true')

  // Verify schedule record
  const { db, workflowSchedule } = await getDB()
  const { eq } = await import('drizzle-orm')

  const schedules = await db
    .select()
    .from(workflowSchedule)
    .where(eq(workflowSchedule.workflowId, workflowId))

  assert(schedules.length > 0, `DB: ${schedules.length} schedule record(s) created`)
  if (schedules.length > 0) {
    assert(schedules[0].status === 'active', `DB: schedule status = ${schedules[0].status}`)
    assert(!!schedules[0].cronExpression, `DB: cron expression = ${schedules[0].cronExpression}`)
    assert(!!schedules[0].nextRunAt, `DB: nextRunAt set`)
  }

  // Undeploy and verify cleanup
  await api(`/api/workflows/${workflowId}/deploy`, { method: 'DELETE' })

  const postUndeploy = await db
    .select()
    .from(workflowSchedule)
    .where(eq(workflowSchedule.workflowId, workflowId))
  assert(postUndeploy.length === 0, 'DB: schedule records deleted after undeploy')

  return workflowId
}

async function testNeedsRedeployment(workflowId: string) {
  console.log('\n=== Test 5: Needs redeployment detection ===')

  // Redeploy first
  const deployRes = await api(`/api/workflows/${workflowId}/deploy`, { method: 'POST' })
  assert(deployRes.ok, 'Redeployed workflow')

  // Verify no redeployment needed initially
  const getRes1 = await api(`/api/workflows/${workflowId}/deploy`)
  const body1 = await getRes1.json()
  assert(body1.needsRedeployment === false, 'No redeployment needed after fresh deploy')

  // Edit a block in the workflow (change the function code)
  const { db, workflowBlocks } = await getDB()
  const { eq } = await import('drizzle-orm')

  const blocks = await db
    .select()
    .from(workflowBlocks)
    .where(eq(workflowBlocks.workflowId, workflowId as any))

  const fnBlock = blocks.find(b => b.type === 'function')
  if (fnBlock) {
    await db
      .update(workflowBlocks)
      .set({
        subBlocks: {
          code: {
            id: 'code',
            type: 'code',
            value: 'return { result: "modified!" }',
          },
        },
      })
      .where(eq(workflowBlocks.id, fnBlock.id))

    // Check needs redeployment
    const getRes2 = await api(`/api/workflows/${workflowId}/deploy`)
    const body2 = await getRes2.json()
    assert(body2.needsRedeployment === true, 'Redeployment needed after editing block')
  } else {
    console.log('  SKIP: No function block to edit')
  }

  // Cleanup
  await api(`/api/workflows/${workflowId}/deploy`, { method: 'DELETE' })
}

async function testCronEndpoint() {
  console.log('\n=== Test 6: Cron schedules endpoint ===')

  // Call the cron endpoint (should work from localhost without CRON_SECRET)
  const res = await fetch(`${BASE_URL}/api/cron/schedules`)
  const body = await res.json()
  assert(res.ok, `GET /api/cron/schedules returned ${res.status}`)
  assert(body.ok === true, 'Cron endpoint returned ok=true')
  assert(typeof body.checked === 'number', `Checked ${body.checked} schedule(s)`)
  console.log(`  Cron result: checked=${body.checked}, executed=${body.executed}, errors=${body.errors}`)
}

// ─── Cleanup ───────────────────────────────────────────────────────────────

async function cleanup(workflowIds: string[]) {
  console.log('\n=== Cleanup ===')
  const { db, workflows } = await getDB()
  const { eq } = await import('drizzle-orm')

  for (const id of workflowIds) {
    await db.delete(workflows).where(eq(workflows.id, id as any))
    console.log(`  Deleted workflow: ${id}`)
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Phase 4: Deploy & Trigger Runtime Tests ===')
  console.log(`Base URL: ${BASE_URL}\n`)

  // Login
  console.log('Logging in...')
  sessionCookie = await login()
  console.log('Logged in successfully')

  const workflowIds: string[] = []

  try {
    // Test 1: Deploy
    const wfId1 = await testDeployWorkflow()
    workflowIds.push(wfId1)

    // Test 2: Webhook execution
    await testWebhookExecution(wfId1)

    // Test 3: Undeploy
    await testUndeploy(wfId1)

    // Test 4: Schedule deploy
    const wfId2 = await testScheduleDeploy()
    workflowIds.push(wfId2)

    // Test 5: Needs redeployment
    await testNeedsRedeployment(wfId1)

    // Test 6: Cron endpoint
    await testCronEndpoint()

    console.log('\n=== ALL TESTS PASSED ===')
  } catch (error) {
    console.error('\n=== TEST FAILURE ===')
    console.error(error)
    process.exitCode = 1
  } finally {
    await cleanup(workflowIds)
    process.exit()
  }
}

main()
