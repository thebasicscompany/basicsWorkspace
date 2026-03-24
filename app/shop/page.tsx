import { Storefront } from "@phosphor-icons/react/dist/ssr"
import { PageTransition } from "@/components/page-transition"
import { AppHeader } from "@/components/app-header"
import { EmptyState } from "@/components/ui/empty-state"

export default function ShopPage() {
  return (
    <>
      <AppHeader
        breadcrumb={[{ label: "Shop" }]}
      />
      <PageTransition>
        <div className="flex-1 p-8" style={{ background: "var(--color-bg-base)" }}>
          <EmptyState
            icon={<Storefront size={40} className="text-zinc-300" />}
            title="App Store coming soon"
            description="Browse automations, apps, and connections to power your workspace."
          />
        </div>
      </PageTransition>
    </>
  )
}
