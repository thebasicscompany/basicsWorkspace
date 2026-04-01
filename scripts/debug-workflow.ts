import { config } from "dotenv"
config({ path: ".env.local" })

async function main() {
  const { db } = await import("../lib/db")
  const { workflows, workflowBlocks, workflowEdges } = await import("../lib/db/schema/workflows")
  const { eq, ilike } = await import("drizzle-orm")

  // List all workflows
  const wfs = await db.select({ id: workflows.id, name: workflows.name }).from(workflows)
  console.log("=== All Workflows ===")
  for (const w of wfs) console.log(`  ${w.id} | ${w.name}`)

  // Find the one with sentiment/analyzer
  const target = wfs.find(w =>
    w.name.toLowerCase().includes("api") ||
    w.name.toLowerCase().includes("analyz") ||
    w.name.toLowerCase().includes("sentiment") ||
    w.name.toLowerCase().includes("data")
  )

  if (!target) {
    // Check all blocks for "sentiment" or "condition"
    console.log("\nLooking for condition blocks with sentiment...")
    const allBlocks = await db.select().from(workflowBlocks)
    for (const b of allBlocks) {
      const subs = JSON.stringify(b.subBlocks || {})
      if (subs.toLowerCase().includes("sentiment") || subs.toLowerCase().includes("positive")) {
        console.log(`\n  Block: ${b.id} (${b.type}) "${b.name}" in workflow ${b.workflowId}`)
        console.log(`  SubBlocks: ${subs.slice(0, 500)}`)
      }
    }
    process.exit(0)
    return
  }

  console.log(`\n=== Workflow: ${target.name} (${target.id}) ===`)

  const blocks = await db.select().from(workflowBlocks).where(eq(workflowBlocks.workflowId, target.id))
  const edges = await db.select().from(workflowEdges).where(eq(workflowEdges.workflowId, target.id))

  console.log("\n--- Blocks ---")
  for (const b of blocks) {
    console.log(`\n  ${b.type} "${b.name}" (${b.id})`)
    console.log(`  SubBlocks: ${JSON.stringify(b.subBlocks, null, 2).slice(0, 1000)}`)
  }

  console.log("\n--- Edges ---")
  for (const e of edges) {
    console.log(`  ${e.sourceBlockId} -> ${e.targetBlockId} (handle: ${e.sourceHandle})`)
  }

  process.exit(0)
}

main().catch(console.error)
