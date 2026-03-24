import { Robot } from "@phosphor-icons/react/dist/ssr"
import { PageTransition } from "@/components/page-transition"
import { AppHeader } from "@/components/app-header"
import { EmptyState } from "@/components/ui/empty-state"

export default function AgentPage() {
  return (
    <>
      <AppHeader
        breadcrumb={[{ label: "Agent" }]}
      />
      <PageTransition>
        <div className="flex-1 p-8" style={{ background: "var(--color-bg-base)" }}>
          <EmptyState
            icon={<Robot size={40} className="text-zinc-300" />}
            title="Agent coming soon"
            description="Talk to your OS — build automations, query CRM, and get things done."
          />
        </div>
      </PageTransition>
    </>
  )
}
