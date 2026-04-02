import { WorkflowCanvasLoader } from "@/apps/automations/components/workflow-canvas-loader"

type Props = { params: Promise<{ id: string }> }

export default async function WorkflowCanvasPage({ params }: Props) {
  const { id } = await params
  return <WorkflowCanvasLoader workflowId={id} />
}
