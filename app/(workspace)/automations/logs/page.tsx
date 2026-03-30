import { PageTransition } from "@/components/page-transition"
import { AppHeader } from "@/components/app-header"
import { ExecutionLogsDashboard } from "@/apps/automations/components/execution-logs-dashboard"

export default function AutomationsLogsPage() {
  return (
    <>
      <AppHeader
        breadcrumb={[
          { label: "Workspace", href: "/" },
          { label: "Automations", href: "/automations" },
          { label: "Execution Logs" },
        ]}
      />
      <PageTransition>
        <ExecutionLogsDashboard />
      </PageTransition>
    </>
  )
}
