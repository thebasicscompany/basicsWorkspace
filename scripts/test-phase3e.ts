/**
 * Phase 3E integration test — verifies DB tables, persistence utils, and schedule logic.
 * Run: npx tsx scripts/test-phase3e.ts
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq } from 'drizzle-orm'
import {
  workflows,
  workflowBlocks,
  workflowDeploymentVersion,
  webhook,
  workflowSchedule,
} from '../lib/db/schema/workflows'

const client = postgres(process.env.DATABASE_URL!, { max: 1 })
const db = drizzle(client)

async function test() {
  let passed = 0
  let failed = 0

  function ok(name: string) {
    passed++
    console.log(`  ✓ ${name}`)
  }
  function fail(name: string, err: any) {
    failed++
    console.log(`  ✗ ${name}: ${err}`)
  }

  console.log('\n=== Phase 3E DB Tests ===\n')

  // 1. Test tables exist
  console.log('1. Table existence:')
  try {
    await db.select().from(workflowDeploymentVersion).limit(1)
    ok('workflowDeploymentVersion table exists')
  } catch (e: any) { fail('workflowDeploymentVersion', e.message) }

  try {
    await db.select().from(webhook).limit(1)
    ok('webhook table exists')
  } catch (e: any) { fail('webhook', e.message) }

  try {
    await db.select().from(workflowSchedule).limit(1)
    ok('workflowSchedule table exists')
  } catch (e: any) { fail('workflowSchedule', e.message) }

  // 2. Test column schema by inserting + reading + deleting
  console.log('\n2. Schema validation (insert/read/delete):')

  // Find an existing workflow to reference
  const [existingWf] = await db.select().from(workflows).limit(1)
  if (!existingWf) {
    console.log('  ⚠ No workflows in DB — skipping FK-dependent tests')
  } else {
    const testWfId = existingWf.id
    const testVersionId = `test-version-${Date.now()}`
    const testWebhookId = `test-webhook-${Date.now()}`
    const testScheduleId = `test-schedule-${Date.now()}`

    // 2a. workflowDeploymentVersion
    try {
      await db.insert(workflowDeploymentVersion).values({
        id: testVersionId,
        workflowId: testWfId,
        version: 99,
        state: { blocks: {}, edges: [], loops: {}, parallels: {} },
        isActive: false,
        createdBy: 'test',
        deployedBy: 'test',
        name: 'Test Version',
        description: 'Test description',
      })
      const [row] = await db
        .select()
        .from(workflowDeploymentVersion)
        .where(eq(workflowDeploymentVersion.id, testVersionId))
      if (row && row.version === 99 && row.isActive === false && row.name === 'Test Version') {
        ok('workflowDeploymentVersion insert/read — all columns work')
      } else {
        fail('workflowDeploymentVersion', `unexpected data: ${JSON.stringify(row)}`)
      }
      await db.delete(workflowDeploymentVersion).where(eq(workflowDeploymentVersion.id, testVersionId))
      ok('workflowDeploymentVersion delete')
    } catch (e: any) { fail('workflowDeploymentVersion CRUD', e.message) }

    // 2b. webhook
    try {
      await db.insert(webhook).values({
        id: testWebhookId,
        workflowId: testWfId,
        deploymentVersionId: null,
        blockId: 'test-block',
        path: 'test-path-' + Date.now(),
        provider: 'github',
        providerConfig: { event: 'push' },
        isActive: true,
      })
      const [row] = await db.select().from(webhook).where(eq(webhook.id, testWebhookId))
      if (row && row.provider === 'github' && row.isActive === true && row.path.startsWith('test-path-')) {
        ok('webhook insert/read — all columns work')
      } else {
        fail('webhook', `unexpected data: ${JSON.stringify(row)}`)
      }
      await db.delete(webhook).where(eq(webhook.id, testWebhookId))
      ok('webhook delete')
    } catch (e: any) { fail('webhook CRUD', e.message) }

    // 2c. workflowSchedule
    try {
      await db.insert(workflowSchedule).values({
        id: testScheduleId,
        workflowId: testWfId,
        blockId: 'test-block',
        cronExpression: '*/5 * * * *',
        timezone: 'America/New_York',
        status: 'active',
      })
      const [row] = await db.select().from(workflowSchedule).where(eq(workflowSchedule.id, testScheduleId))
      if (row && row.cronExpression === '*/5 * * * *' && row.timezone === 'America/New_York') {
        ok('workflowSchedule insert/read — all columns work')
      } else {
        fail('workflowSchedule', `unexpected data: ${JSON.stringify(row)}`)
      }
      await db.delete(workflowSchedule).where(eq(workflowSchedule.id, testScheduleId))
      ok('workflowSchedule delete')
    } catch (e: any) { fail('workflowSchedule CRUD', e.message) }
  }

  // 3. Test schedule utils (pure functions, no DB)
  console.log('\n3. Schedule utils:')
  try {
    const { validateCronExpression, generateCronExpression, getScheduleTimeValues } = await import('../lib/workflows/schedules/utils')

    const valid = validateCronExpression('*/5 * * * *')
    if (valid.isValid && valid.nextRun) {
      ok('validateCronExpression — valid cron accepted')
    } else {
      fail('validateCronExpression', 'valid cron rejected')
    }

    const invalid = validateCronExpression('not a cron')
    if (!invalid.isValid) {
      ok('validateCronExpression — invalid cron rejected')
    } else {
      fail('validateCronExpression', 'invalid cron accepted')
    }

    const empty = validateCronExpression('')
    if (!empty.isValid) {
      ok('validateCronExpression — empty string rejected')
    } else {
      fail('validateCronExpression', 'empty string accepted')
    }

    // Test generateCronExpression
    const mockBlock = {
      type: 'schedule',
      subBlocks: {
        scheduleType: { value: 'daily' },
        dailyTime: { value: '14:30' },
        timezone: { value: 'UTC' },
        minutesInterval: { value: '15' },
        hourlyMinute: { value: '0' },
        weeklyDay: { value: 'MON' },
        weeklyDayTime: { value: '09:00' },
        monthlyDay: { value: '1' },
        monthlyTime: { value: '09:00' },
        cronExpression: { value: '' },
      },
    }
    const values = getScheduleTimeValues(mockBlock)
    const cron = generateCronExpression('daily', values)
    if (cron === '30 14 * * *') {
      ok('generateCronExpression — daily 14:30 → "30 14 * * *"')
    } else {
      fail('generateCronExpression', `expected "30 14 * * *", got "${cron}"`)
    }

    const minutesCron = generateCronExpression('minutes', { ...values, minutesInterval: 10 })
    if (minutesCron === '*/10 * * * *') {
      ok('generateCronExpression — every 10 min → "*/10 * * * *"')
    } else {
      fail('generateCronExpression', `expected "*/10 * * * *", got "${minutesCron}"`)
    }
  } catch (e: any) { fail('schedule utils import', e.message) }

  // 4. Test schedule validation
  console.log('\n4. Schedule validation:')
  try {
    const { validateWorkflowSchedules, validateScheduleBlock } = await import('../lib/workflows/schedules/validation')

    // No schedule blocks → valid
    const noSchedules = validateWorkflowSchedules({
      'block1': { type: 'agent', subBlocks: {}, id: 'block1' } as any,
    })
    if (noSchedules.isValid) {
      ok('validateWorkflowSchedules — no schedule blocks → valid')
    } else {
      fail('validateWorkflowSchedules', 'no schedules should be valid')
    }

    // Valid schedule block
    const validBlock = {
      type: 'schedule',
      id: 'sched1',
      status: 'active',
      subBlocks: {
        scheduleType: { value: 'daily' },
        dailyTime: { value: '09:00' },
        timezone: { value: 'UTC' },
        minutesInterval: { value: '' },
        hourlyMinute: { value: '' },
        weeklyDay: { value: '' },
        weeklyDayTime: { value: '' },
        monthlyDay: { value: '' },
        monthlyTime: { value: '' },
        cronExpression: { value: '' },
      },
    }
    const validResult = validateScheduleBlock(validBlock as any)
    if (validResult.isValid && validResult.cronExpression === '0 9 * * *') {
      ok('validateScheduleBlock — daily 09:00 → valid, cron "0 9 * * *"')
    } else {
      fail('validateScheduleBlock', `${validResult.isValid} / ${validResult.cronExpression} / ${validResult.error}`)
    }

    // Missing schedule type
    const missingType = validateScheduleBlock({
      type: 'schedule',
      id: 'sched2',
      status: 'active',
      subBlocks: { scheduleType: { value: '' } },
    } as any)
    if (!missingType.isValid) {
      ok('validateScheduleBlock — missing type → invalid')
    } else {
      fail('validateScheduleBlock', 'missing type should be invalid')
    }
  } catch (e: any) { fail('schedule validation import', e.message) }

  // 5. Test persistence utils (pure function parts)
  console.log('\n5. Persistence utils:')
  try {
    const {
      loadWorkflowFromNormalizedTables,
      blockExistsInDeployment,
    } = await import('../lib/workflows/persistence/utils')

    // loadWorkflowFromNormalizedTables for a non-existent workflow
    const noData = await loadWorkflowFromNormalizedTables('00000000-0000-0000-0000-000000000000')
    if (noData === null) {
      ok('loadWorkflowFromNormalizedTables — non-existent workflow returns null')
    } else {
      fail('loadWorkflowFromNormalizedTables', 'should return null for missing workflow')
    }

    // blockExistsInDeployment for a non-existent workflow
    const noBlock = await blockExistsInDeployment('00000000-0000-0000-0000-000000000000', 'fake-block')
    if (noBlock === false) {
      ok('blockExistsInDeployment — non-existent workflow returns false')
    } else {
      fail('blockExistsInDeployment', 'should return false')
    }
  } catch (e: any) { fail('persistence utils import', e.message) }

  // Summary
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`)
  await client.end()
  process.exit(failed > 0 ? 1 : 0)
}

test().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})
