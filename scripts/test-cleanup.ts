import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq } from 'drizzle-orm'
import { webhook } from '../lib/db/schema/workflows'

const client = postgres(process.env.DATABASE_URL!, { max: 1 })
const db = drizzle(client)

async function main() {
  await db.delete(webhook).where(eq(webhook.id, 'test-wh-e2e'))
  console.log('Test webhook cleaned up')
  await client.end()
}
main()
