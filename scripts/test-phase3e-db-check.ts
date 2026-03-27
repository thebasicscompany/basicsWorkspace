import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq } from 'drizzle-orm'
import { workflowDeploymentVersion, webhook, workflowSchedule } from '../lib/db/schema/workflows'

const client = postgres(process.env.DATABASE_URL!, { max: 1 })
const db = drizzle(client)

const wfId = 'd8416647-c74c-4993-b7d8-aeedba3271ba'

async function main() {
  const versions = await db.select().from(workflowDeploymentVersion).where(eq(workflowDeploymentVersion.workflowId, wfId))
  console.log('Deployment versions:', versions.length)
  for (const v of versions) {
    console.log('  v' + v.version, '| active:', v.isActive, '| id:', v.id.slice(0, 8) + '...')
    const state = v.state as any
    console.log('    blocks:', Object.keys(state?.blocks || {}).length, '| edges:', (state?.edges || []).length)
  }

  const whs = await db.select().from(webhook).where(eq(webhook.workflowId, wfId))
  console.log('Webhooks:', whs.length)
  for (const w of whs) {
    console.log('  id:', w.id.slice(0, 8) + '... | path:', w.path, '| provider:', w.provider, '| active:', w.isActive)
  }

  const scheds = await db.select().from(workflowSchedule).where(eq(workflowSchedule.workflowId, wfId))
  console.log('Schedules:', scheds.length)

  await client.end()
}

main()
