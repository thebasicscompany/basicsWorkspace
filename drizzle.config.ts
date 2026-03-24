import { config } from "dotenv"
import type { Config } from "drizzle-kit"

config({ path: ".env.local" })

export default {
  schema: "./lib/db/schema",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config
