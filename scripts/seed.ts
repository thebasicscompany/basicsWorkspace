import { auth } from "../lib/auth"

async function seed() {
  console.log("Seeding database…")

  try {
    await auth.api.signUpEmail({
      body: {
        name: "Admin",
        email: "admin@example.com",
        password: "admin123",
      },
    })
    console.log("Created admin user: admin@example.com / admin123")
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes("already exists") || msg.includes("duplicate") || msg.includes("ALREADY_EXISTS")) {
      console.log("Admin user already exists — skipping")
    } else {
      console.error("Seed error:", msg)
      process.exit(1)
    }
  }

  console.log("Done.")
  process.exit(0)
}

seed()
