'use client'

import dynamic from 'next/dynamic'

const WorkflowCanvas = dynamic(
  () => import('./workflow-canvas').then((m) => m.WorkflowCanvas),
  { ssr: false }
)

export function WorkflowCanvasLoader({ workflowId }: { workflowId: string }) {
  return <WorkflowCanvas workflowId={workflowId} />
}
