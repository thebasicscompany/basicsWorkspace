"use client"

import { Buildings, Globe, Briefcase, Users, Calendar } from "@phosphor-icons/react"
import { RecordTable, type ColumnDef } from "@/components/ui/record-table"
import type { Company } from "@/apps/crm/types"

const COLUMNS: ColumnDef<Company>[] = [
  { key: "name",     label: "Name",     icon: Buildings, width: 220 },
  { key: "domain",   label: "Domain",   icon: Globe,     width: 190 },
  { key: "industry", label: "Industry", icon: Briefcase, width: 160 },
  { key: "size",     label: "Size",     icon: Users,     width: 110 },
  {
    key: "createdAt",
    label: "Created",
    icon: Calendar,
    width: 120,
    render: (value) =>
      value ? (
        <span style={{ color: "var(--color-text-tertiary)", fontSize: 12 }}>
          {new Date(String(value)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      ) : null,
  },
]

export function CompaniesTable({
  companies,
  onRowClick,
  onAddRow,
  isLoading,
}: {
  companies: Company[]
  onRowClick?: (c: Company) => void
  onAddRow?: () => void
  isLoading?: boolean
}) {
  return (
    <RecordTable
      columns={COLUMNS}
      rows={companies}
      onRowClick={onRowClick}
      onAddRow={onAddRow}
      isLoading={isLoading}
    />
  )
}
