import { Graph } from "@phosphor-icons/react/dist/ssr"
import { PageTransition } from "@/components/page-transition"
import { AppHeader } from "@/components/app-header"
import { EmptyState } from "@/components/ui/empty-state"

export default function ContextPage() {
  return (
    <>
      <AppHeader
        breadcrumb={[{ label: "Context" }]}
      />
      <PageTransition>
        <div className="flex-1 p-8" style={{ background: "var(--color-bg-base)" }}>
          <EmptyState
            icon={<Graph size={40} className="text-zinc-300" />}
            title="Context universe coming soon"
            description="Everything from every app — timeline, graph, and table in one place."
          />
        </div>
      </PageTransition>
    </>
  )
}
