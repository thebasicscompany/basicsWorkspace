import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

declare global {
  // eslint-disable-next-line no-var
  var _db: ReturnType<typeof drizzle> | undefined
}

function createDb() {
  const client = postgres(process.env.DATABASE_URL!, { max: 1 })
  return drizzle(client, { schema })
}

export const db = globalThis._db ?? createDb()

if (process.env.NODE_ENV !== "production") {
  globalThis._db = db
}
