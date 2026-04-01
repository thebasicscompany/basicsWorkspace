import { config } from "dotenv"
config({ path: ".env.local" })

async function main() {
  const { db } = await import("../lib/db")
  const { records } = await import("../lib/db/schema/objects")
  const { eq, sql } = await import("drizzle-orm")

  const orgId = "org_seed_default"

  // Clear existing seed data
  await db.delete(records).where(
    sql`${records.orgId} = ${orgId} AND ${records.objectType} IN ('contacts', 'companies', 'deals', 'tasks', 'notes')`
  )
  console.log("Cleared existing records")

  // ── Companies ───────────────────────────────────────────────────────────
  const companies = [
    { name: "Acme Corp", domain: "acme.com", industry: "Technology", size: "500-1000" },
    { name: "Globex Industries", domain: "globex.io", industry: "Manufacturing", size: "1000-5000" },
    { name: "Initech", domain: "initech.co", industry: "Software", size: "50-200" },
    { name: "Stark Industries", domain: "stark.industries", industry: "Defense & Tech", size: "5000+" },
    { name: "Wayne Enterprises", domain: "wayne.enterprises", industry: "Conglomerate", size: "5000+" },
    { name: "Oscorp", domain: "oscorp.com", industry: "Biotech", size: "1000-5000" },
    { name: "Hooli", domain: "hooli.com", industry: "Technology", size: "1000-5000" },
    { name: "Pied Piper", domain: "pied-piper.com", industry: "Software", size: "10-50" },
    { name: "Raviga Capital", domain: "raviga.vc", industry: "Venture Capital", size: "10-50" },
    { name: "Zenith Labs", domain: "zenith.io", industry: "AI/ML", size: "50-200" },
    { name: "Capsule Corp", domain: "capsule.co", industry: "Hardware", size: "200-500" },
    { name: "Neuralink Systems", domain: "neuralink.dev", industry: "Neuroscience", size: "200-500" },
  ]

  const companyIds: Record<string, string> = {}
  for (let i = 0; i < companies.length; i++) {
    const daysAgo = 90 - i * 7
    const createdAt = new Date(Date.now() - daysAgo * 86400000)
    const [row] = await db.insert(records).values({
      orgId, objectType: "companies", data: companies[i], createdAt, updatedAt: createdAt,
    }).returning()
    companyIds[companies[i].name] = row.id
  }
  console.log(`Inserted ${companies.length} companies`)

  // ── Contacts ────────────────────────────────────────────────────────────
  const contacts = [
    { firstName: "Sarah", lastName: "Chen", email: "sarah.chen@acme.com", phone: "+1-415-555-0101", companyId: companyIds["Acme Corp"], status: "active" },
    { firstName: "Marcus", lastName: "Williams", email: "marcus.w@globex.io", phone: "+1-212-555-0102", companyId: companyIds["Globex Industries"], status: "active" },
    { firstName: "Priya", lastName: "Patel", email: "priya@initech.co", phone: "+1-650-555-0103", companyId: companyIds["Initech"], status: "active" },
    { firstName: "James", lastName: "O'Brien", email: "jobrien@acme.com", phone: "+1-312-555-0104", companyId: companyIds["Acme Corp"], status: "inactive" },
    { firstName: "Aisha", lastName: "Mohammed", email: "aisha.m@stark.industries", phone: "+1-617-555-0105", companyId: companyIds["Stark Industries"], status: "active" },
    { firstName: "David", lastName: "Kim", email: "dkim@wayne.enterprises", phone: "+1-310-555-0106", companyId: companyIds["Wayne Enterprises"], status: "lead" },
    { firstName: "Elena", lastName: "Rodriguez", email: "elena.r@oscorp.com", phone: "+1-718-555-0107", companyId: companyIds["Oscorp"], status: "active" },
    { firstName: "Thomas", lastName: "Andersen", email: "tandersen@globex.io", phone: "+1-202-555-0108", companyId: companyIds["Globex Industries"], status: "lead" },
    { firstName: "Mei", lastName: "Zhang", email: "mei.zhang@capsule.co", phone: "+1-415-555-0109", companyId: companyIds["Capsule Corp"], status: "active" },
    { firstName: "Robert", lastName: "Johnson", email: "rjohnson@hooli.com", phone: "+1-650-555-0110", companyId: companyIds["Hooli"], status: "churned" },
    { firstName: "Lisa", lastName: "Park", email: "lpark@pied-piper.com", phone: "+1-408-555-0111", companyId: companyIds["Pied Piper"], status: "active" },
    { firstName: "Ahmed", lastName: "Hassan", email: "ahmed.h@zenith.io", phone: "+1-510-555-0112", companyId: companyIds["Zenith Labs"], status: "lead" },
    { firstName: "Sophie", lastName: "Dubois", email: "sophie.d@raviga.vc", phone: "+1-415-555-0113", companyId: companyIds["Raviga Capital"], status: "active" },
    { firstName: "Carlos", lastName: "Reyes", email: "creyes@initech.co", phone: "+1-213-555-0114", companyId: companyIds["Initech"], status: "active" },
    { firstName: "Yuki", lastName: "Tanaka", email: "yuki.t@oscorp.com", phone: "+1-646-555-0115", companyId: companyIds["Oscorp"], status: "lead" },
    { firstName: "Rachel", lastName: "Green", email: "rgreen@hooli.com", phone: "+1-212-555-0116", companyId: companyIds["Hooli"], status: "active" },
    { firstName: "Nathan", lastName: "Scott", email: "nscott@acme.com", phone: "+1-570-555-0117", companyId: companyIds["Acme Corp"], status: "active" },
    { firstName: "Fatima", lastName: "Al-Rashid", email: "fatima@zenith.io", phone: "+1-305-555-0118", companyId: companyIds["Zenith Labs"], status: "active" },
    { firstName: "Luke", lastName: "Bennett", email: "lbennett@stark.industries", phone: "+1-512-555-0119", companyId: companyIds["Stark Industries"], status: "inactive" },
    { firstName: "Olivia", lastName: "Chang", email: "ochang@neuralink.dev", phone: "+1-415-555-0120", companyId: companyIds["Neuralink Systems"], status: "active" },
    { firstName: "Daniel", lastName: "Murphy", email: "dmurphy@pied-piper.com", phone: "+1-628-555-0121", companyId: companyIds["Pied Piper"], status: "lead" },
    { firstName: "Ingrid", lastName: "Svensson", email: "ingrid.s@wayne.enterprises", phone: "+1-917-555-0122", companyId: companyIds["Wayne Enterprises"], status: "active" },
    { firstName: "Victor", lastName: "Okoro", email: "vokoro@globex.io", phone: "+1-347-555-0123", companyId: companyIds["Globex Industries"], status: "active" },
    { firstName: "Anna", lastName: "Kowalski", email: "akowalski@capsule.co", phone: "+1-415-555-0124", companyId: companyIds["Capsule Corp"], status: "lead" },
    { firstName: "Ryan", lastName: "Torres", email: "rtorres@raviga.vc", phone: "+1-628-555-0125", companyId: companyIds["Raviga Capital"], status: "active" },
  ]

  for (let i = 0; i < contacts.length; i++) {
    const daysAgo = 60 - i * 2
    const createdAt = new Date(Date.now() - daysAgo * 86400000)
    await db.insert(records).values({
      orgId, objectType: "contacts", data: contacts[i], createdAt, updatedAt: createdAt,
    })
  }
  console.log(`Inserted ${contacts.length} contacts`)

  // ── Deals ───────────────────────────────────────────────────────────────
  const deals = [
    { name: "Acme Enterprise License", status: "won", amount: 125000, companyId: companyIds["Acme Corp"], ownerId: "", closedAt: new Date(Date.now() - 10 * 86400000).toISOString() },
    { name: "Globex Platform Migration", status: "negotiation", amount: 85000, companyId: companyIds["Globex Industries"], ownerId: "" },
    { name: "Initech SaaS Rollout", status: "proposal", amount: 42000, companyId: companyIds["Initech"], ownerId: "" },
    { name: "Stark Industries POC", status: "discovery", amount: 250000, companyId: companyIds["Stark Industries"], ownerId: "" },
    { name: "Wayne Enterprises Renewal", status: "won", amount: 180000, companyId: companyIds["Wayne Enterprises"], ownerId: "", closedAt: new Date(Date.now() - 30 * 86400000).toISOString() },
    { name: "Oscorp Research Tools", status: "proposal", amount: 67000, companyId: companyIds["Oscorp"], ownerId: "" },
    { name: "Hooli Analytics Bundle", status: "lost", amount: 95000, companyId: companyIds["Hooli"], ownerId: "" },
    { name: "Pied Piper Startup Plan", status: "won", amount: 15000, companyId: companyIds["Pied Piper"], ownerId: "", closedAt: new Date(Date.now() - 5 * 86400000).toISOString() },
    { name: "Zenith Labs AI Module", status: "negotiation", amount: 110000, companyId: companyIds["Zenith Labs"], ownerId: "" },
    { name: "Capsule Corp Hardware Int.", status: "discovery", amount: 55000, companyId: companyIds["Capsule Corp"], ownerId: "" },
    { name: "Neuralink Custom Build", status: "proposal", amount: 200000, companyId: companyIds["Neuralink Systems"], ownerId: "" },
    { name: "Raviga Portfolio Tool", status: "won", amount: 32000, companyId: companyIds["Raviga Capital"], ownerId: "", closedAt: new Date(Date.now() - 45 * 86400000).toISOString() },
  ]

  for (let i = 0; i < deals.length; i++) {
    const daysAgo = 45 - i * 3
    const createdAt = new Date(Date.now() - daysAgo * 86400000)
    await db.insert(records).values({
      orgId, objectType: "deals", data: deals[i], createdAt, updatedAt: createdAt,
    })
  }
  console.log(`Inserted ${deals.length} deals`)

  // ── Tasks ───────────────────────────────────────────────────────────────
  const tasks = [
    { title: "Follow up with Sarah on Q2 renewal", status: "todo", dueAt: new Date(Date.now() + 3 * 86400000).toISOString() },
    { title: "Send proposal to Stark Industries", status: "in_progress", dueAt: new Date(Date.now() + 1 * 86400000).toISOString() },
    { title: "Review Globex migration timeline", status: "todo", dueAt: new Date(Date.now() + 7 * 86400000).toISOString() },
    { title: "Schedule demo for Oscorp team", status: "done", dueAt: new Date(Date.now() - 2 * 86400000).toISOString() },
    { title: "Update CRM with Hooli loss notes", status: "todo", dueAt: new Date(Date.now() + 2 * 86400000).toISOString() },
    { title: "Prepare board deck for Raviga", status: "done", dueAt: new Date(Date.now() - 5 * 86400000).toISOString() },
    { title: "Onboard Pied Piper account", status: "in_progress", dueAt: new Date(Date.now() + 5 * 86400000).toISOString() },
    { title: "Draft Neuralink SOW", status: "todo", dueAt: new Date(Date.now() + 10 * 86400000).toISOString() },
    { title: "Quarterly pipeline review", status: "todo", dueAt: new Date(Date.now() + 14 * 86400000).toISOString() },
    { title: "Collect testimonial from Wayne Enterprises", status: "in_progress", dueAt: new Date(Date.now() + 4 * 86400000).toISOString() },
  ]

  for (let i = 0; i < tasks.length; i++) {
    const daysAgo = 20 - i * 2
    const createdAt = new Date(Date.now() - daysAgo * 86400000)
    await db.insert(records).values({
      orgId, objectType: "tasks", data: tasks[i], createdAt, updatedAt: createdAt,
    })
  }
  console.log(`Inserted ${tasks.length} tasks`)

  // ── Notes ───────────────────────────────────────────────────────────────
  const notes = [
    { title: "Acme Q2 strategy call", body: "Sarah mentioned they're expanding to APAC. Key concern is data residency. Follow up with compliance team." },
    { title: "Globex migration requirements", body: "Need SSO integration, custom roles, and audit logging. Marcus wants a phased rollout over 6 weeks." },
    { title: "Competitive intel: Hooli", body: "Hooli chose competitor due to pricing. Their contract is 2 years. Revisit in 18 months." },
    { title: "Pied Piper onboarding checklist", body: "1. API keys provisioned\n2. Sandbox environment set up\n3. Training session scheduled for next Tuesday\n4. Documentation shared" },
    { title: "Stark Industries discovery notes", body: "Massive opportunity. They need workflow automation across 12 departments. Budget approved for Q3. Key stakeholder: Aisha Mohammed." },
    { title: "Weekly standup notes - Mar 25", body: "Pipeline at $1.2M. 4 deals in negotiation. Focus this week: close Zenith Labs and send Neuralink SOW." },
  ]

  for (let i = 0; i < notes.length; i++) {
    const daysAgo = 15 - i * 2
    const createdAt = new Date(Date.now() - daysAgo * 86400000)
    await db.insert(records).values({
      orgId, objectType: "notes", data: notes[i], createdAt, updatedAt: createdAt,
    })
  }
  console.log(`Inserted ${notes.length} notes`)

  console.log("\nDone! Seeded 12 companies, 25 contacts, 12 deals, 10 tasks, 6 notes.")
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
