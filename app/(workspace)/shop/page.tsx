import { PageTransition } from "@/components/page-transition"
import { AppHeader } from "@/components/app-header"
import { ConnectionsGrid } from "@/apps/shop/components/connections-grid"

export default function ShopPage() {
  return (
    <>
      <AppHeader
        breadcrumb={[{ label: "Shop" }]}
      />
      <PageTransition>
        <div className="flex-1 p-8" style={{ background: "var(--color-bg-base)" }}>
          <div className="mb-6">
            <h2 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Connections
            </h2>
            <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
              Connect your tools and services to use them in automations.
            </p>
          </div>
          <ConnectionsGrid />
        </div>
      </PageTransition>
    </>
  )
}
