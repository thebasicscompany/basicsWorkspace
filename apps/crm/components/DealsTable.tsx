"use client"

import { CurrencyDollar, Tag, Buildings, Calendar, CheckCircle } from "@phosphor-icons/react"
import { RecordTable, type ColumnDef } from "@/components/ui/record-table"
import type { Deal } from "@/apps/crm/types"

const STAGE_COLORS: Record<string, string> = {
  "Open":        "#6366F1",
  "Qualified":   "#F59E0B",
  "Proposal":    "#3B82F6",
  "Negotiation": "#8B5CF6",
  "Closed Won":  "#2563EB",
  "Closed Lost": "#EF4444",
}

const COLUMNS: ColumnDef<Deal>[] = [
  { key: "name", label: "Deal", icon: CurrencyDollar, width: 240 },
  {
    key: "status",
    label: "Stage",
    icon: Tag,
    width: 130,
    render: (value) => {
      if (!value) return null
      const label = String(value)
      const color = STAGE_COLORS[label] ?? "var(--color-text-tertiary)"
      return (
        <span
          className="inline-flex items-center px-2 rounded-full text-white"
          style={{ fontSize: 11, fontWeight: 500, background: color, height: 18, lineHeight: 1 }}
        >
          {label}
        </span>
      )
    },
  },
  {
    key: "amount",
    label: "Amount",
    icon: CurrencyDollar,
    width: 120,
    render: (value) =>
      value != null ? (
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>
          {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value))}
        </span>
      ) : null,
  },
  { key: "company", label: "Company", icon: Buildings, width: 160 },
  {
    key: "closedAt",
    label: "Close date",
    icon: CheckCircle,
    width: 120,
    render: (value) =>
      value ? (
        <span style={{ color: "var(--color-text-tertiary)", fontSize: 12 }}>
          {new Date(String(value)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      ) : null,
  },
  {
    key: "createdAt",
    label: "Created",
    icon: Calendar,
    width: 110,
    render: (value) =>
      value ? (
        <span style={{ color: "var(--color-text-tertiary)", fontSize: 12 }}>
          {new Date(String(value)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      ) : null,
  },
]

export function DealsTable({
  deals,
  onRowClick,
  onAddRow,
  isLoading,
}: {
  deals: Deal[]
  onRowClick?: (d: Deal) => void
  onAddRow?: () => void
  isLoading?: boolean
}) {
  return (
    <RecordTable
      columns={COLUMNS}
      rows={deals}
      onRowClick={onRowClick}
      onAddRow={onAddRow}
      isLoading={isLoading}
    />
  )
}
