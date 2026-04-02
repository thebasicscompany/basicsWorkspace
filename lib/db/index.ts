import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

declare global {
  // eslint-disable-next-line no-var
  var _db: ReturnType<typeof drizzle> | undefined
}

function createDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — cannot start without a database connection")
  }
  const client = postgres(process.env.DATABASE_URL, {
    max: process.env.NODE_ENV === "production" ? 10 : 1,
  })
  return drizzle(client, { schema })
}

export const db = globalThis._db ?? createDb()

if (process.env.NODE_ENV !== "production") {
  globalThis._db = db
}
