import { WorkflowCanvas } from "@/apps/automations/components/workflow-canvas"

type Props = { params: Promise<{ id: string }> }

export default async function WorkflowCanvasPage({ params }: Props) {
  const { id } = await params
  return <WorkflowCanvas workflowId={id} />
}
