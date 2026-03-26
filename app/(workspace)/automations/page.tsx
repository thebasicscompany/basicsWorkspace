import { PageTransition } from "@/components/page-transition"
import { AppHeader } from "@/components/app-header"
import { WorkflowList } from "@/apps/automations/components/workflow-list"

export default function AutomationsPage() {
  return (
    <>
      <AppHeader
        breadcrumb={[
          { label: "Workspace", href: "/" },
          { label: "Automations" },
        ]}
      />
      <PageTransition>
        <WorkflowList />
      </PageTransition>
    </>
  )
}
