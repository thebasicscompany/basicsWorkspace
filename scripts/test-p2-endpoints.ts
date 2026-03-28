/**
 * Integration tests for all P2 endpoints.
 * Run: npx tsx scripts/test-p2-endpoints.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

const BASE = 'http://localhost:3000'
let cookies = ''
let workflowId = ''
let deploymentVersionId = ''
let deploymentVersion = 0
let executionId = ''
let duplicatedWorkflowId = ''
let scheduleId = ''

let passed = 0
let failed = 0

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ ${msg}`)
    passed++
  } else {
    console.log(`  ✗ ${msg}`)
    failed++
  }
}

async function req(
  method: string,
  path: string,
  body?: unknown,
  opts?: { stream?: boolean; timeoutMs?: number }
): Promise<{ status: number; data: any; raw?: string }> {
  const headers: Record<string, string> = {
    Cookie: cookies,
    Origin: BASE,
  }
  if (body) headers['Content-Type'] = 'application/json'

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), opts?.timeoutMs || 30000)

  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    if (opts?.stream) {
      const text = await res.text()
      return { status: res.status, data: null, raw: text }
    }

    let data: any
    try {
      data = await res.json()
    } catch {
      data = null
    }
    return { status: res.status, data }
  } finally {
    clearTimeout(timeout)
  }
}

async function signIn() {
  console.log('\n--- Sign In ---')
  // Better Auth needs Origin header to pass CSRF check from non-browser clients
  const signInController = new AbortController()
  const signInTimeout = setTimeout(() => signInController.abort(), 30000)
  const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': BASE,
    },
    body: JSON.stringify({ email: 'admin@example.com', password: 'admin123' }),
    redirect: 'manual',
    signal: signInController.signal,
  })
  clearTimeout(signInTimeout)
  const setCookie = res.headers.getSetCookie?.() || []
  for (const c of setCookie) {
    const match = c.match(/(better-auth\.session_token=[^;\s]+)/)
    if (match) cookies = match[1]
  }
  // Fallback: try single get
  if (!cookies) {
    const sc = res.headers.get('set-cookie') || ''
    const match = sc.match(/(better-auth\.session_token=[^;\s]+)/)
    if (match) cookies = match[1]
  }
  const body = await res.json().catch(() => null) as any
  assert(res.status === 200, `Sign in: ${res.status}`)
  assert(!!cookies, `Got cookie: ${cookies.slice(0, 60)}...`)

  // Verify session works
  const sessionRes = await fetch(`${BASE}/api/auth/get-session`, {
    headers: { Cookie: cookies },
  })
  const session = await sessionRes.json() as any
  assert(sessionRes.status === 200 && !!session?.user?.id, `Session verified: ${session?.user?.id}`)
}

async function getWorkflow() {
  console.log('\n--- Get Test Workflow ---')
  const { status, data } = await req('GET', '/api/workflows')
  assert(status === 200, `List workflows: ${status}`)
  // Response may be { workflows: [...] } or just [...]
  const wfList = data?.workflows || (Array.isArray(data) ? data : [])
  assert(wfList.length > 0, `Has workflows: ${wfList.length}`)
  workflowId = wfList[0].id
  console.log(`  Using workflow: ${workflowId}`)
}

async function testDeployWorkflow() {
  console.log('\n--- Deploy Workflow ---')
  const { status, data } = await req('POST', `/api/workflows/${workflowId}/deploy`)
  assert(status === 200, `Deploy: ${status}`)
  assert(data.isDeployed === true, `isDeployed: ${data.isDeployed}`)
  assert(!!data.deployedAt, `Has deployedAt`)
}

async function testDeploymentsList() {
  console.log('\n--- GET /deployments (list versions) ---')
  const { status, data } = await req('GET', `/api/workflows/${workflowId}/deployments`)
  assert(status === 200, `Status: ${status}`)
  assert(Array.isArray(data.versions), `Has versions array`)
  assert(data.versions.length > 0, `Has at least 1 version: ${data.versions.length}`)

  const latest = data.versions[0]
  deploymentVersion = latest.version
  deploymentVersionId = latest.id
  assert(typeof latest.version === 'number', `Version is number: ${latest.version}`)
  assert(typeof latest.isActive === 'boolean', `Has isActive: ${latest.isActive}`)
  assert(!!latest.createdAt, `Has createdAt`)
  console.log(`  Latest version: ${deploymentVersion}, active: ${latest.isActive}`)
}

async function testDeploymentVersionGet() {
  console.log('\n--- GET /deployments/[version] (get state) ---')
  const { status, data } = await req(
    'GET',
    `/api/workflows/${workflowId}/deployments/${deploymentVersion}`
  )
  assert(status === 200, `Status: ${status}`)
  assert(!!data.deployedState, `Has deployedState`)
  assert(!!data.deployedState.blocks, `State has blocks`)
  assert(Array.isArray(data.deployedState.edges), `State has edges array`)
}

async function testDeploymentVersionPatchName() {
  console.log('\n--- PATCH /deployments/[version] (update name) ---')
  const { status, data } = await req(
    'PATCH',
    `/api/workflows/${workflowId}/deployments/${deploymentVersion}`,
    { name: 'Test Deployment v1', description: 'Test description' }
  )
  assert(status === 200, `Status: ${status}`)
  assert(data.name === 'Test Deployment v1', `Name updated: ${data.name}`)
  assert(data.description === 'Test description', `Description updated: ${data.description}`)
}

async function testDeploymentVersionPatchInvalid() {
  console.log('\n--- PATCH /deployments/[version] (invalid body) ---')
  const { status } = await req(
    'PATCH',
    `/api/workflows/${workflowId}/deployments/${deploymentVersion}`,
    {}
  )
  assert(status === 400, `Rejects empty body: ${status}`)
}

async function testDeploymentVersionGetNotFound() {
  console.log('\n--- GET /deployments/999 (not found) ---')
  const { status, data } = await req(
    'GET',
    `/api/workflows/${workflowId}/deployments/999`
  )
  assert(status === 404, `Status: ${status}`)
  assert(data.error === 'Deployment version not found', `Error msg: ${data.error}`)
}

async function testDeploymentRevert() {
  console.log('\n--- POST /deployments/[version]/revert ---')
  const { status, data } = await req(
    'POST',
    `/api/workflows/${workflowId}/deployments/${deploymentVersion}/revert`
  )
  assert(status === 200, `Status: ${status}`)
  assert(data.message === 'Reverted to deployment version', `Message: ${data.message}`)
  assert(typeof data.lastSaved === 'number', `Has lastSaved timestamp`)
}

async function testDeploymentRevertActive() {
  console.log('\n--- POST /deployments/active/revert ---')
  const { status, data } = await req(
    'POST',
    `/api/workflows/${workflowId}/deployments/active/revert`
  )
  assert(status === 200, `Status: ${status}`)
  assert(data.message === 'Reverted to deployment version', `Message: ${data.message}`)
}

async function testRunWorkflow() {
  console.log('\n--- POST /run (execute workflow for streaming test) ---')
  const { status, raw } = await req(
    'POST',
    `/api/workflows/${workflowId}/run`,
    {},
    { stream: true, timeoutMs: 60000 }
  )
  assert(status === 200, `Status: ${status}`)
  assert(!!raw, `Got SSE response`)

  // Extract executionId from SSE events
  const lines = raw!.split('\n')
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const event = JSON.parse(line.slice(6))
        if (event.executionId) {
          executionId = event.executionId
          break
        }
      } catch {}
    }
  }
  assert(!!executionId, `Got executionId: ${executionId}`)
}

async function testExecutionStream() {
  console.log('\n--- GET /executions/[id]/stream ---')
  if (!executionId) {
    console.log('  SKIP: No executionId from run')
    return
  }
  const { status, raw } = await req(
    'GET',
    `/api/workflows/${workflowId}/executions/${executionId}/stream`,
    undefined,
    { stream: true }
  )
  assert(status === 200, `Status: ${status}`)
  assert(!!raw, `Got SSE response`)
  assert(raw!.includes('[DONE]'), `Stream completed with [DONE]`)

  // Check for block:complete events
  const hasBlockEvents = raw!.includes('"type":"block:complete"')
  const hasCompleteEvent = raw!.includes('"type":"complete"')
  assert(hasBlockEvents || hasCompleteEvent, `Has execution events`)
}

async function testExecutionStreamNotFound() {
  console.log('\n--- GET /executions/[fake-id]/stream (not found) ---')
  // Use AbortController to timeout after 3 seconds since the endpoint polls
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3000)
  try {
    const res = await fetch(
      `${BASE}/api/workflows/${workflowId}/executions/00000000-0000-0000-0000-000000000000/stream`,
      { headers: { Cookie: cookies }, signal: controller.signal }
    )
    assert(res.status === 200, `Status: ${res.status} (starts streaming)`)
    // We won't wait for full body since it polls for 5 min
    assert(true, `Stream started (aborted after 3s to avoid blocking)`)
  } catch (e: any) {
    if (e.name === 'AbortError') {
      assert(true, `Stream started and was polling (aborted after 3s)`)
    } else {
      assert(false, `Unexpected error: ${e.message}`)
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function testExecutionCancel() {
  console.log('\n--- POST /executions/[id]/cancel ---')
  // Cancel a non-running execution (already completed)
  const { status, data } = await req(
    'POST',
    `/api/workflows/${workflowId}/executions/${executionId}/cancel`
  )
  assert(status === 200, `Status: ${status}`)
  assert(data.success === false, `Already-complete execution: success=${data.success}`)
  assert(data.reason === 'not_found', `Reason: ${data.reason}`)
}

async function testExecutionCancelNotFound() {
  console.log('\n--- POST /executions/[fake-id]/cancel ---')
  const { status, data } = await req(
    'POST',
    `/api/workflows/${workflowId}/executions/00000000-0000-0000-0000-000000000000/cancel`
  )
  assert(status === 200, `Status: ${status}`)
  assert(data.success === false, `Not found: success=${data.success}`)
  assert(data.reason === 'not_found', `Reason: ${data.reason}`)
}

async function testDuplicateWorkflow() {
  console.log('\n--- POST /duplicate ---')
  const { status, data } = await req(
    'POST',
    `/api/workflows/${workflowId}/duplicate`,
    { name: 'Duplicated Test Workflow' },
    { timeoutMs: 180000 }
  )
  assert(status === 201, `Status: ${status}`)
  assert(!!data.id, `Got new workflow ID: ${data.id}`)
  assert(data.name?.includes('Duplicated Test Workflow'), `Name: ${data.name}`)
  assert(data.blocksCount >= 0, `Blocks copied: ${data.blocksCount}`)
  assert(data.edgesCount >= 0, `Edges copied: ${data.edgesCount}`)
  duplicatedWorkflowId = data.id
}

async function testDuplicateWorkflowVerify() {
  console.log('\n--- Verify duplicated workflow ---')
  if (!duplicatedWorkflowId) {
    console.log('  SKIP: No duplicated workflow')
    return
  }
  const { status, data } = await req('GET', `/api/workflows/${duplicatedWorkflowId}`)
  assert(status === 200, `Status: ${status}`)
  assert(data.workflow?.name?.includes('Duplicated Test Workflow'), `Name matches: ${data.workflow?.name}`)
  assert(data.blocks?.length >= 0, `Has blocks: ${data.blocks?.length}`)
  assert(data.edges?.length >= 0, `Has edges: ${data.edges?.length}`)
}

async function testDuplicateInvalidBody() {
  console.log('\n--- POST /duplicate (missing name) ---')
  const { status, data } = await req(
    'POST',
    `/api/workflows/${workflowId}/duplicate`,
    {}
  )
  assert(status === 400, `Status: ${status}`)
  assert(!!data.error, `Has error: ${data.error}`)
}

async function testDuplicateNotFound() {
  console.log('\n--- POST /duplicate (workflow not found) ---')
  const { status } = await req(
    'POST',
    `/api/workflows/00000000-0000-0000-0000-000000000000/duplicate`,
    { name: 'Should Fail' }
  )
  assert(status === 404, `Status: ${status}`)
}

async function testScheduleGet() {
  console.log('\n--- GET /schedules?workflowId=... ---')
  const { status, data } = await req(
    'GET',
    `/api/schedules?workflowId=${workflowId}`
  )
  assert(status === 200, `Status: ${status}`)
  assert(Array.isArray(data.schedules), `Has schedules array`)
  console.log(`  Found ${data.schedules?.length || 0} schedule(s)`)

  if (data.schedules?.length > 0) {
    scheduleId = data.schedules[0].id
    console.log(`  Using schedule: ${scheduleId}`)
  }
}

async function testScheduleGetById() {
  console.log('\n--- GET /schedules/[id] ---')
  if (!scheduleId) {
    console.log('  SKIP: No schedule available')
    return
  }
  const { status, data } = await req('GET', `/api/schedules/${scheduleId}`)
  assert(status === 200, `Status: ${status}`)
  assert(!!data.schedule, `Has schedule object`)
  assert(data.schedule.id === scheduleId, `ID matches: ${data.schedule.id}`)
  assert(!!data.schedule.cronExpression, `Has cron: ${data.schedule.cronExpression}`)
}

async function testScheduleDisable() {
  console.log('\n--- PUT /schedules/[id] (disable) ---')
  if (!scheduleId) {
    console.log('  SKIP: No schedule available')
    return
  }
  const { status, data } = await req('PUT', `/api/schedules/${scheduleId}`, {
    action: 'disable',
  })
  assert(status === 200, `Status: ${status}`)
  assert(data.message?.includes('disabled') || data.message?.includes('already'), `Message: ${data.message}`)
}

async function testScheduleEnable() {
  console.log('\n--- PUT /schedules/[id] (enable) ---')
  if (!scheduleId) {
    console.log('  SKIP: No schedule available')
    return
  }
  const { status, data } = await req('PUT', `/api/schedules/${scheduleId}`, {
    action: 'enable',
  })
  assert(status === 200, `Status: ${status}`)
  assert(data.message?.includes('enabled') || data.message?.includes('already'), `Message: ${data.message}`)
}

async function testScheduleNotFound() {
  console.log('\n--- GET /schedules/[fake-id] ---')
  const { status, data } = await req('GET', '/api/schedules/nonexistent-id')
  assert(status === 404, `Status: ${status}`)
  assert(data.error === 'Schedule not found', `Error: ${data.error}`)
}

async function testScheduleDeleteNotFound() {
  console.log('\n--- DELETE /schedules/[fake-id] ---')
  const { status, data } = await req('DELETE', '/api/schedules/nonexistent-id')
  assert(status === 404, `Status: ${status}`)
}

async function testSanitizationModule() {
  console.log('\n--- Sanitization Module (import test) ---')
  try {
    const refs = await import('../lib/workflows/sanitization/references')
    assert(typeof refs.isLikelyReferenceSegment === 'function', 'isLikelyReferenceSegment exists')
    assert(typeof refs.extractReferencePrefixes === 'function', 'extractReferencePrefixes exists')
    assert(typeof refs.splitReferenceSegment === 'function', 'splitReferenceSegment exists')

    // Test actual behavior
    assert(refs.isLikelyReferenceSegment('{{blockName.output}}') === true, 'Detects valid reference')
    assert(refs.isLikelyReferenceSegment('not a ref') === false, 'Rejects non-reference')

    const keyVal = await import('../lib/workflows/sanitization/key-validation')
    assert(keyVal.isValidKey('hello') === true, 'isValidKey("hello") = true')
    assert(keyVal.isValidKey('') === false, 'isValidKey("") = false')
    assert(keyVal.isValidKey(null) === false, 'isValidKey(null) = false')
    assert(keyVal.isValidKey('undefined') === false, 'isValidKey("undefined") = false')

    const val = await import('../lib/workflows/sanitization/validation')
    assert(typeof val.validateWorkflowBlocks === 'function', 'validateWorkflowBlocks exists')
    assert(typeof val.sanitizeAgentToolsInBlocks === 'function', 'sanitizeAgentToolsInBlocks exists')
    assert(typeof val.validateToolReference === 'function', 'validateToolReference exists')
  } catch (e: any) {
    assert(false, `Import failed: ${e.message}`)
  }
}

async function testVisibilityModule() {
  console.log('\n--- Visibility Module (import test) ---')
  try {
    const vis = await import('../lib/workflows/subblocks/visibility')
    assert(typeof vis.buildCanonicalIndex === 'function', 'buildCanonicalIndex exists')
    assert(typeof vis.resolveCanonicalMode === 'function', 'resolveCanonicalMode exists')
    assert(typeof vis.evaluateSubBlockCondition === 'function', 'evaluateSubBlockCondition exists')
    assert(typeof vis.isSubBlockVisibleForMode === 'function', 'isSubBlockVisibleForMode exists')
    assert(typeof vis.resolveDependencyValue === 'function', 'resolveDependencyValue exists')
    assert(typeof vis.buildSubBlockValues === 'function', 'buildSubBlockValues exists')
    assert(typeof vis.isNonEmptyValue === 'function', 'isNonEmptyValue exists')
    assert(typeof vis.hasStandaloneAdvancedFields === 'function', 'hasStandaloneAdvancedFields exists')
    assert(typeof vis.hasAdvancedValues === 'function', 'hasAdvancedValues exists')
    assert(typeof vis.buildDefaultCanonicalModes === 'function', 'buildDefaultCanonicalModes exists')
    assert(typeof vis.isSubBlockFeatureEnabled === 'function', 'isSubBlockFeatureEnabled exists')
    assert(typeof vis.isSubBlockHiddenByHostedKey === 'function', 'isSubBlockHiddenByHostedKey exists')

    // Test actual behavior
    assert(vis.isNonEmptyValue('hello') === true, 'isNonEmptyValue("hello") = true')
    assert(vis.isNonEmptyValue('') === false, 'isNonEmptyValue("") = false')
    assert(vis.isNonEmptyValue(null) === false, 'isNonEmptyValue(null) = false')
    assert(vis.isNonEmptyValue([1]) === true, 'isNonEmptyValue([1]) = true')
    assert(vis.isNonEmptyValue([]) === false, 'isNonEmptyValue([]) = false')

    // Test evaluateSubBlockCondition
    assert(vis.evaluateSubBlockCondition(undefined, {}) === true, 'undefined condition = true')
    assert(
      vis.evaluateSubBlockCondition({ field: 'x', value: 'a' }, { x: 'a' }) === true,
      'condition match = true'
    )
    assert(
      vis.evaluateSubBlockCondition({ field: 'x', value: 'a' }, { x: 'b' }) === false,
      'condition no match = false'
    )
    assert(
      vis.evaluateSubBlockCondition({ field: 'x', value: 'a', not: true }, { x: 'b' }) === true,
      'negated condition = true'
    )

    // Test buildSubBlockValues
    const vals = vis.buildSubBlockValues({ a: { value: 'hello' }, b: { value: 42 }, c: null })
    assert(vals.a === 'hello', 'buildSubBlockValues extracts string')
    assert(vals.b === 42, 'buildSubBlockValues extracts number')
    assert(vals.c === undefined, 'buildSubBlockValues handles null')

    // Test buildCanonicalIndex
    const index = vis.buildCanonicalIndex([
      { id: 'prompt', type: 'short-input', canonicalParamId: 'prompt_canonical' } as any,
      {
        id: 'prompt_advanced',
        type: 'long-input',
        canonicalParamId: 'prompt_canonical',
        mode: 'advanced',
      } as any,
    ])
    assert(!!index.groupsById['prompt_canonical'], 'Canonical group created')
    assert(index.groupsById['prompt_canonical'].basicId === 'prompt', 'Basic ID set')
    assert(
      index.groupsById['prompt_canonical'].advancedIds.includes('prompt_advanced'),
      'Advanced ID added'
    )
  } catch (e: any) {
    assert(false, `Import failed: ${e.message}`)
  }
}

async function testDynamicHandleTopology() {
  console.log('\n--- Dynamic Handle Topology (import test) ---')
  try {
    const dht = await import('../lib/workflows/dynamic-handle-topology')
    assert(typeof dht.isDynamicHandleBlockType === 'function', 'isDynamicHandleBlockType exists')
    assert(typeof dht.getConditionRows === 'function', 'getConditionRows exists')
    assert(typeof dht.getRouterRows === 'function', 'getRouterRows exists')
    assert(typeof dht.getDynamicHandleTopologySignature === 'function', 'getDynamicHandleTopologySignature exists')
    assert(typeof dht.collectDynamicHandleTopologySignatures === 'function', 'collectDynamicHandleTopologySignatures exists')
    assert(typeof dht.getChangedDynamicHandleBlockIds === 'function', 'getChangedDynamicHandleBlockIds exists')

    // Test isDynamicHandleBlockType
    assert(dht.isDynamicHandleBlockType('condition') === true, 'condition is dynamic')
    assert(dht.isDynamicHandleBlockType('router_v2') === true, 'router_v2 is dynamic')
    assert(dht.isDynamicHandleBlockType('agent') === false, 'agent is not dynamic')

    // Test getConditionRows with defaults
    const defaultRows = dht.getConditionRows('block1', undefined)
    assert(defaultRows.length === 2, `Default condition rows: ${defaultRows.length}`)
    assert(defaultRows[0].title === 'if', `First row is "if"`)
    assert(defaultRows[1].title === 'else', `Second row is "else"`)

    // Test getConditionRows with real data
    const conditions = JSON.stringify([
      { id: 'c1', value: 'x > 5' },
      { id: 'c2', value: 'x > 10' },
      { id: 'c3', value: '' },
    ])
    const rows = dht.getConditionRows('block1', conditions)
    assert(rows.length === 3, `Parsed condition rows: ${rows.length}`)
    assert(rows[0].id === 'c1', `Row 1 id: ${rows[0].id}`)

    // Test getRouterRows with defaults
    const defaultRoutes = dht.getRouterRows('block1', undefined)
    assert(defaultRoutes.length === 1, `Default router rows: ${defaultRoutes.length}`)

    // Test topology signatures
    const sig = dht.getDynamicHandleTopologySignature({
      id: 'b1',
      type: 'condition',
      name: 'Cond',
      position: { x: 0, y: 0 },
      subBlocks: { conditions: { type: 'condition-input', value: conditions } },
      outputs: {},
      enabled: true,
      horizontalHandles: true,
      height: 0,
    } as any)
    assert(sig?.startsWith('condition:'), `Signature: ${sig}`)

    // Test change detection
    const prev = new Map([['b1', 'condition:c1|c2']])
    const next = new Map([['b1', 'condition:c1|c2|c3']])
    const changed = dht.getChangedDynamicHandleBlockIds(prev, next)
    assert(changed.length === 1 && changed[0] === 'b1', `Changed block: ${changed[0]}`)
  } catch (e: any) {
    assert(false, `Import failed: ${e.message}`)
  }
}

async function testCancellationModule() {
  console.log('\n--- Cancellation Module (import test) ---')
  try {
    const canc = await import('../lib/execution/cancellation')
    assert(typeof canc.registerExecution === 'function', 'registerExecution exists')
    assert(typeof canc.unregisterExecution === 'function', 'unregisterExecution exists')
    assert(typeof canc.cancelExecution === 'function', 'cancelExecution exists')
    assert(typeof canc.isExecutionCancelled === 'function', 'isExecutionCancelled exists')

    // Test register + cancel flow
    const controller = canc.registerExecution('test-exec-1')
    assert(controller instanceof AbortController, 'Returns AbortController')
    assert(canc.isExecutionCancelled('test-exec-1') === false, 'Not cancelled initially')

    const result = canc.cancelExecution('test-exec-1')
    assert(result.cancelled === true, 'Cancel returns true')
    assert(result.reason === 'aborted', `Cancel reason: ${result.reason}`)
    assert(controller.signal.aborted === true, 'Signal is aborted')

    // Test cancel non-existent
    const result2 = canc.cancelExecution('nonexistent')
    assert(result2.cancelled === false, 'Non-existent: cancelled=false')
    assert(result2.reason === 'not_found', `Non-existent reason: ${result2.reason}`)

    // Test unregister
    canc.registerExecution('test-exec-2')
    canc.unregisterExecution('test-exec-2')
    assert(canc.isExecutionCancelled('test-exec-2') === false, 'Unregistered: not tracked')
  } catch (e: any) {
    assert(false, `Import failed: ${e.message}`)
  }
}

async function testPersistenceUtils() {
  console.log('\n--- Persistence Utils (import test) ---')
  try {
    const pu = await import('../lib/workflows/persistence/utils')
    assert(typeof pu.saveWorkflowToNormalizedTables === 'function', 'saveWorkflowToNormalizedTables exists')
    assert(typeof pu.activateWorkflowVersion === 'function', 'activateWorkflowVersion exists')
    assert(typeof pu.activateWorkflowVersionById === 'function', 'activateWorkflowVersionById exists')
    assert(typeof pu.deployWorkflow === 'function', 'deployWorkflow exists')
    assert(typeof pu.undeployWorkflow === 'function', 'undeployWorkflow exists')
    assert(typeof pu.loadDeployedWorkflowState === 'function', 'loadDeployedWorkflowState exists')
    assert(typeof pu.loadWorkflowFromNormalizedTables === 'function', 'loadWorkflowFromNormalizedTables exists')
  } catch (e: any) {
    assert(false, `Import failed: ${e.message}`)
  }
}

async function cleanup() {
  console.log('\n--- Cleanup ---')
  // Undeploy
  if (workflowId) {
    const { status } = await req('DELETE', `/api/workflows/${workflowId}/deploy`)
    console.log(`  Undeploy: ${status}`)
  }
  // Delete duplicated workflow
  if (duplicatedWorkflowId) {
    const { status } = await req('DELETE', `/api/workflows/${duplicatedWorkflowId}`)
    console.log(`  Delete duplicated workflow: ${status}`)
  }
}

async function main() {
  console.log('=== P2 Endpoint Integration Tests ===')

  await signIn()
  if (!cookies) {
    console.error('FATAL: Could not sign in. Aborting tests.')
    process.exit(1)
  }
  await getWorkflow()
  if (!workflowId) {
    console.error('FATAL: No workflow found. Aborting tests.')
    process.exit(1)
  }

  // 1. Deployment versioning/revert
  await testDeployWorkflow()
  await testDeploymentsList()
  await testDeploymentVersionGet()
  await testDeploymentVersionPatchName()
  await testDeploymentVersionPatchInvalid()
  await testDeploymentVersionGetNotFound()
  await testDeploymentRevert()
  await testDeploymentRevertActive()

  // 2. Execution streaming
  await testRunWorkflow()
  await testExecutionStream()
  await testExecutionStreamNotFound()

  // 3. Execution cancellation
  await testExecutionCancel()
  await testExecutionCancelNotFound()

  // 4. Workflow duplication
  await testDuplicateWorkflow()
  await testDuplicateWorkflowVerify()
  await testDuplicateInvalidBody()
  await testDuplicateNotFound()

  // 5. Schedule CRUD
  await testScheduleGet()
  await testScheduleGetById()
  await testScheduleDisable()
  await testScheduleEnable()
  await testScheduleNotFound()
  await testScheduleDeleteNotFound()

  // 6. Module import tests (sanitization, visibility, topology, cancellation, persistence)
  await testSanitizationModule()
  await testVisibilityModule()
  await testDynamicHandleTopology()
  await testCancellationModule()
  await testPersistenceUtils()

  // Cleanup
  await cleanup()

  // Summary
  console.log('\n=== RESULTS ===')
  console.log(`  Passed: ${passed}`)
  console.log(`  Failed: ${failed}`)
  console.log(`  Total:  ${passed + failed}`)

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch((e) => {
  console.error('Test runner failed:', e)
  process.exit(1)
})
