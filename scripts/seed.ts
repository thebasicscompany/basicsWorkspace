// dotenv MUST load before any db/auth imports — use dynamic imports below
import { config } from "dotenv"
config({ path: ".env.local" })

const SEED_EMAIL = "admin@example.com"
const SEED_PASSWORD = "admin123"
const SEED_ORG_ID = "org_seed_default"
const SEED_ORG_SLUG = "demo"

async function seed() {
  // Dynamic imports so DATABASE_URL is set before drizzle connects
  const { auth } = await import("../lib/auth")
  const { db } = await import("../lib/db")
  const { organization, member } = await import("../lib/db/schema")
  const { seedSystemObjects } = await import("../lib/objects")

  console.log("Seeding database…")

  // 1. Create admin user
  let userId: string | undefined
  try {
    const result = await auth.api.signUpEmail({
      body: { name: "Admin", email: SEED_EMAIL, password: SEED_PASSWORD },
    })
    userId = result.user.id
    console.log("Created admin user:", SEED_EMAIL, "/ admin123")
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (
      msg.includes("already exists") ||
      msg.includes("duplicate") ||
      msg.includes("ALREADY_EXISTS") ||
      msg.includes("USER_ALREADY_EXISTS")
    ) {
      console.log("Admin user already exists — skipping user creation")
      const session = await auth.api.signInEmail({
        body: { email: SEED_EMAIL, password: SEED_PASSWORD },
      })
      userId = session.user.id
    } else {
      console.error("Seed error:", msg)
      process.exit(1)
    }
  }

  if (!userId) {
    console.error("Could not resolve admin user ID")
    process.exit(1)
  }

  // 2. Create demo org
  await db
    .insert(organization)
    .values({
      id: SEED_ORG_ID,
      name: "Demo Workspace",
      slug: SEED_ORG_SLUG,
      createdAt: new Date(),
    })
    .onConflictDoNothing()
  console.log("Created org: Demo Workspace (or already existed)")

  // 3. Add admin as owner
  await db
    .insert(member)
    .values({
      id: `member_${userId}`,
      organizationId: SEED_ORG_ID,
      userId,
      role: "owner",
      createdAt: new Date(),
    })
    .onConflictDoNothing()
  console.log("Added admin as org owner (or already existed)")

  // 4. Seed system object configs
  await seedSystemObjects(SEED_ORG_ID)
  console.log("Seeded system object configs (contacts, companies, deals, tasks, notes, meetings)")

  console.log("\nDone. Login: admin@example.com / admin123")
  process.exit(0)
}

seed()
