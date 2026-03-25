"use client"

import type { ReactNode } from "react"
import {
  TextT,
  Hash,
  CalendarBlank,
  Tag,
  CheckSquare,
  Link,
  At,
  Phone,
  ArrowRight,
  Calendar,
} from "@phosphor-icons/react"
import type { Icon as PhosphorIcon } from "@phosphor-icons/react"
import { RecordTable, type ColumnDef } from "@/components/ui/record-table"
import type { ObjectField } from "@/lib/db/schema"
import type { ApiRecord } from "@/apps/crm/types"

// Flat row: top-level id + createdAt + all data fields spread
type FlatRow = { id: string; createdAt: string } & Record<string, unknown>

const TYPE_ICONS: Partial<Record<ObjectField["type"], PhosphorIcon>> = {
  text: TextT,
  number: Hash,
  date: CalendarBlank,
  select: Tag,
  multi_select: Tag,
  checkbox: CheckSquare,
  url: Link,
  email: At,
  phone: Phone,
  relation: ArrowRight,
}

function renderCell(field: ObjectField, value: unknown): ReactNode {
  if (value == null || value === "") return null

  switch (field.type) {
    case "select":
    case "multi_select": {
      const ids = field.type === "multi_select" && Array.isArray(value) ? value : [value]
      const optMap = Object.fromEntries((field.options ?? []).map((o) => [o.id, o]))
      return (
        <div className="flex items-center gap-1 flex-wrap">
          {ids.map((id, i) => {
            const opt = optMap[String(id)]
            if (!opt) return <span key={i} style={{ fontSize: 12 }}>{String(id)}</span>
            return (
              <span
                key={i}
                className="inline-flex items-center px-2 rounded-full text-white"
                style={{ fontSize: 11, fontWeight: 500, background: opt.color || "#6B7280", height: 18, lineHeight: 1 }}
              >
                {opt.label}
              </span>
            )
          })}
        </div>
      )
    }
    case "checkbox":
      return (
        <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
          {value ? "Yes" : "No"}
        </span>
      )
    case "date":
      return (
        <span style={{ color: "var(--color-text-tertiary)", fontSize: 12 }}>
          {new Date(String(value)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      )
    case "url":
      return (
        <span
          className="truncate"
          style={{ color: "var(--color-accent)", fontSize: 13 }}
          title={String(value)}
        >
          {String(value)}
        </span>
      )
    default:
      return String(value)
  }
}

const INLINE_EDITABLE: ObjectField["type"][] = ["text", "number", "email", "phone", "url", "relation"]

function fieldToColumn(field: ObjectField, index: number): ColumnDef<FlatRow> {
  return {
    key: field.key,
    label: field.name,
    icon: TYPE_ICONS[field.type],
    width: index === 0 ? 220 : 160,
    editable: INLINE_EDITABLE.includes(field.type),
    render: (value) => renderCell(field, value),
  }
}

export function flattenRecord(r: ApiRecord): FlatRow {
  return { id: r.id, createdAt: r.createdAt, ...r.data }
}

export function ObjectRecordTable({
  fields,
  records,
  onRowClick,
  onAddRow,
  onCellEdit,
  isLoading,
}: {
  fields: ObjectField[]
  records: ApiRecord[]
  onRowClick?: (row: FlatRow) => void
  onAddRow?: () => void
  onCellEdit?: (rowId: string, key: string, value: unknown) => void
  isLoading?: boolean
}) {
  const sorted = [...fields].sort((a, b) => a.position - b.position)

  const columns: ColumnDef<FlatRow>[] = [
    ...sorted.map((f, i) => fieldToColumn(f, i)),
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

  const rows = records.map(flattenRecord)

  return (
    <RecordTable
      columns={columns}
      rows={rows}
      onRowClick={onRowClick}
      onAddRow={onAddRow}
      onCellEdit={onCellEdit}
      isLoading={isLoading}
    />
  )
}
