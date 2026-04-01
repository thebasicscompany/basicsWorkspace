import { config } from "dotenv"
config({ path: ".env.local" })

async function main() {
  const { db } = await import("../lib/db")
  const { workflowBlocks, workflowEdges } = await import("../lib/db/schema/workflows")
  const { eq } = await import("drizzle-orm")

  const conditionBlockId = "20000000-0002-0002-0002-000000000004"
  const positivePathId = "20000000-0002-0002-0002-000000000005"
  const negativePathId = "20000000-0002-0002-0002-000000000006"

  const ifCondId = `${conditionBlockId}-if`
  const elseCondId = `${conditionBlockId}-else`

  // Fix condition block — set proper expression
  const conditions = JSON.stringify([
    {
      id: ifCondId,
      title: "if",
      value: '<Analyzer.content>.toLowerCase().includes("positive")',
    },
    {
      id: elseCondId,
      title: "else",
      value: "",
    },
  ])

  await db
    .update(workflowBlocks)
    .set({
      subBlocks: {
        conditions: { value: conditions },
      },
    })
    .where(eq(workflowBlocks.id, conditionBlockId as any))

  console.log("Fixed condition block expression")

  // Fix edges — sourceHandle must match "condition-{conditionId}"
  // Positive path: condition-{ifCondId}
  const edges = await db
    .select()
    .from(workflowEdges)
    .where(eq(workflowEdges.sourceBlockId, conditionBlockId as any))

  for (const edge of edges) {
    if (edge.targetBlockId === positivePathId) {
      await db
        .update(workflowEdges)
        .set({ sourceHandle: `condition-${ifCondId}` })
        .where(eq(workflowEdges.id, edge.id))
      console.log(`Fixed edge to Positive Path: condition-${ifCondId}`)
    } else if (edge.targetBlockId === negativePathId) {
      await db
        .update(workflowEdges)
        .set({ sourceHandle: `condition-${elseCondId}` })
        .where(eq(workflowEdges.id, edge.id))
      console.log(`Fixed edge to Negative Path: condition-${elseCondId}`)
    }
  }

  console.log("Done!")
  process.exit(0)
}

main().catch(console.error)
