import { Lightning } from "@phosphor-icons/react/dist/ssr"
import { PageTransition } from "@/components/page-transition"
import { AppHeader } from "@/components/app-header"
import { EmptyState } from "@/components/ui/empty-state"

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
        <div className="flex-1 p-8" style={{ background: "var(--color-bg-base)" }}>
          <EmptyState
            icon={<Lightning size={40} className="text-zinc-300" />}
            title="Automations coming soon"
            description="Build powerful automations that run across all your apps and connections."
          />
        </div>
      </PageTransition>
    </>
  )
}
