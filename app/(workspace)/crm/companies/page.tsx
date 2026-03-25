"use client"

import { useRouter } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import { PageTransition } from "@/components/page-transition"
import { CompaniesTable } from "@/apps/crm/components/CompaniesTable"
import { useRecords } from "@/apps/crm/hooks/useRecords"
import { toCompany } from "@/apps/crm/types"

export default function CompaniesPage() {
  const router = useRouter()
  const { data: companies, loading } = useRecords("companies", toCompany)

  return (
    <>
      <AppHeader
        breadcrumb={[
          { label: "Workspace", href: "/" },
          { label: "CRM", href: "/crm" },
          { label: "Companies" },
        ]}
      />
      <PageTransition>
        <div className="flex flex-col" style={{ height: "calc(100vh - 48px)", background: "var(--color-bg-surface)" }}>
          <div className="flex items-center px-4 shrink-0 border-b" style={{ height: 40, borderColor: "var(--color-border)" }}>
            <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
              {loading ? "Loading…" : `${companies.length} companies`}
            </span>
          </div>
          <CompaniesTable
            companies={companies}
            isLoading={loading}
            onRowClick={(c) => router.push(`/crm/companies/${c.id}`)}
            onAddRow={() => console.log("add company")}
          />
        </div>
      </PageTransition>
    </>
  )
}
