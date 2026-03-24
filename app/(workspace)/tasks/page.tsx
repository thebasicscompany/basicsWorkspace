import { CheckSquare } from "@phosphor-icons/react/dist/ssr"
import { PageTransition } from "@/components/page-transition"
import { AppHeader } from "@/components/app-header"
import { EmptyState } from "@/components/ui/empty-state"

export default function TasksPage() {
  return (
    <>
      <AppHeader
        breadcrumb={[
          { label: "Workspace", href: "/" },
          { label: "Tasks" },
        ]}
      />
      <PageTransition>
        <div className="flex-1 p-8" style={{ background: "var(--color-bg-base)" }}>
          <EmptyState
            icon={<CheckSquare size={40} className="text-zinc-300" />}
            title="Tasks coming soon"
            description="Manage your team's work items and track progress."
          />
        </div>
      </PageTransition>
    </>
  )
}
