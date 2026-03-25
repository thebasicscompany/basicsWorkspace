"use client"

import { useRouter } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import { PageTransition } from "@/components/page-transition"
import { DealsTable } from "@/apps/crm/components/DealsTable"
import { useRecords } from "@/apps/crm/hooks/useRecords"
import { toDeal } from "@/apps/crm/types"

export default function DealsPage() {
  const router = useRouter()
  const { data: deals, loading } = useRecords("deals", toDeal)

  const totalPipeline = deals
    .filter((d) => d.status !== "Closed Lost")
    .reduce((sum, d) => sum + (d.amount ?? 0), 0)

  return (
    <>
      <AppHeader
        breadcrumb={[
          { label: "Workspace", href: "/" },
          { label: "CRM", href: "/crm" },
          { label: "Deals" },
        ]}
      />
      <PageTransition>
        <div className="flex flex-col" style={{ height: "calc(100vh - 48px)", background: "var(--color-bg-surface)" }}>
          <div className="flex items-center gap-4 px-4 shrink-0 border-b" style={{ height: 40, borderColor: "var(--color-border)" }}>
            <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
              {loading ? "Loading…" : `${deals.length} deals`}
            </span>
            {!loading && totalPipeline > 0 && (
              <>
                <span style={{ fontSize: 12, color: "var(--color-border-strong)" }}>·</span>
                <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(totalPipeline)} pipeline
                </span>
              </>
            )}
          </div>
          <DealsTable
            deals={deals}
            isLoading={loading}
            onRowClick={(d) => router.push(`/crm/deals/${d.id}`)}
            onAddRow={() => console.log("add deal")}
          />
        </div>
      </PageTransition>
    </>
  )
}
