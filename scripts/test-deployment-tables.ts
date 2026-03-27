import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { workflowMcpTool, a2aAgent, a2aTask, a2aPushNotificationConfig, chat } from '../lib/db/schema/deployments'

const client = postgres(process.env.DATABASE_URL!, { max: 1 })
const db = drizzle(client)

async function main() {
  try {
    await db.select().from(workflowMcpTool).limit(1)
    console.log('  workflowMcpTool: OK')
  } catch (e: any) { console.log('  workflowMcpTool: FAIL -', e.message) }

  try {
    await db.select().from(a2aAgent).limit(1)
    console.log('  a2aAgent: OK')
  } catch (e: any) { console.log('  a2aAgent: FAIL -', e.message) }

  try {
    await db.select().from(a2aTask).limit(1)
    console.log('  a2aTask: OK')
  } catch (e: any) { console.log('  a2aTask: FAIL -', e.message) }

  try {
    await db.select().from(a2aPushNotificationConfig).limit(1)
    console.log('  a2aPushNotificationConfig: OK')
  } catch (e: any) { console.log('  a2aPushNotificationConfig: FAIL -', e.message) }

  try {
    await db.select().from(chat).limit(1)
    console.log('  chat: OK')
  } catch (e: any) { console.log('  chat: FAIL -', e.message) }

  await client.end()
}
main()
