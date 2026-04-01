"use client"

import { User, Envelope, Phone, Buildings, Tag, Calendar } from "@phosphor-icons/react"
import { RecordTable, type ColumnDef } from "@/components/ui/record-table"
import type { Contact } from "@/apps/crm/types"

export type { Contact }

const STATUS_COLORS: Record<string, string> = {
  Lead: "#6366F1",
  Customer: "#2563EB",
  Churned: "#EF4444",
  Prospect: "#F59E0B",
}

const COLUMNS: ColumnDef<Contact>[] = [
  { key: "name",      label: "Name",    icon: User,      width: 220 },
  { key: "email",     label: "Email",   icon: Envelope,  width: 210 },
  { key: "phone",     label: "Phone",   icon: Phone,     width: 150 },
  { key: "company",   label: "Company", icon: Buildings, width: 170 },
  {
    key: "status",
    label: "Status",
    icon: Tag,
    width: 110,
    render: (value) => {
      if (!value) return null
      const label = String(value)
      const color = STATUS_COLORS[label] ?? "var(--color-text-tertiary)"
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

export function ContactsTable({
  contacts,
  onRowClick,
  onAddRow,
  isLoading,
}: {
  contacts: Contact[]
  onRowClick?: (c: Contact) => void
  onAddRow?: () => void
  isLoading?: boolean
}) {
  return (
    <RecordTable
      columns={COLUMNS}
      rows={contacts}
      onRowClick={onRowClick}
      onAddRow={onAddRow}
      isLoading={isLoading}
    />
  )
}
