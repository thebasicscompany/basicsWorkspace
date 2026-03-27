import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq } from 'drizzle-orm'
import { webhook } from '../lib/db/schema/workflows'

const client = postgres(process.env.DATABASE_URL!, { max: 1 })
const db = drizzle(client)

async function main() {
  // Clean up any existing test webhook
  await db.delete(webhook).where(eq(webhook.id, 'test-wh-e2e'))

  await db.insert(webhook).values({
    id: 'test-wh-e2e',
    workflowId: 'd8416647-c74c-4993-b7d8-aeedba3271ba',
    path: 'e2e-test-path',
    provider: 'generic',
    providerConfig: {},
    isActive: true,
  })
  console.log('Webhook record created with path: e2e-test-path')
  await client.end()
}

main()
