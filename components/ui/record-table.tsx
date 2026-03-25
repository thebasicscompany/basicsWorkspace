"use client"

import { useRef, useState, useCallback, type ReactNode } from "react"
import type { Icon as PhosphorIcon } from "@phosphor-icons/react"
import {
  CheckSquare,
  Square,
  Plus,
  ArrowUp,
  ArrowDown,
  DotsSixVertical,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

// ─── Constants ────────────────────────────────────────────────────────────────

const ROW_HEIGHT = 32
const CHECKBOX_WIDTH = 32
const MIN_COL_WIDTH = 60

// ─── Types ────────────────────────────────────────────────────────────────────

export type ColumnDef<T> = {
  key: string
  label: string
  icon?: PhosphorIcon
  width?: number
  render?: (value: unknown, row: T) => ReactNode
  /** When true and onCellEdit is provided, clicking the cell opens an inline input */
  editable?: boolean
}

type SortState = { key: string; dir: "asc" | "desc" } | null

export type RecordTableProps<T extends { id: string }> = {
  columns: ColumnDef<T>[]
  rows: T[]
  onRowClick?: (row: T) => void
  onCellEdit?: (rowId: string, key: string, value: unknown) => void
  onAddRow?: () => void
  onAddColumn?: () => void
  isLoading?: boolean
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HeaderCell({
  width,
  sticky,
  left,
  shadowRight,
  onClick,
  onResizeStart,
  children,
  noRightBorder,
}: {
  width: number
  sticky?: boolean
  left?: number
  shadowRight?: boolean
  onClick?: () => void
  onResizeStart?: (e: React.MouseEvent) => void
  children?: ReactNode
  noRightBorder?: boolean
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className={cn("relative flex-shrink-0 border-b border-r", noRightBorder && "border-r-0")}
      style={{
        width,
        minWidth: width,
        maxWidth: width,
        height: ROW_HEIGHT,
        background: hovered && onClick ? "var(--color-bg-subtle)" : "var(--color-bg-surface)",
        borderColor: "var(--color-border)",
        position: sticky ? "sticky" : undefined,
        left: sticky ? left : undefined,
        zIndex: sticky ? 3 : undefined,
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
        boxShadow: shadowRight
          ? "inset -1px 0 0 var(--color-border), 4px 0 8px -2px rgba(0,0,0,0.06)"
          : undefined,
        transition: "background 0.08s ease",
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center h-full overflow-hidden">{children}</div>

      {/* Resize handle */}
      {onResizeStart && (
        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize opacity-0 hover:opacity-100 z-10"
          style={{ background: "var(--color-accent)" }}
          onMouseDown={onResizeStart}
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  )
}

function DataCell({
  width,
  sticky,
  left,
  shadowRight,
  isHovered,
  isSelected,
  children,
}: {
  width: number
  sticky?: boolean
  left?: number
  shadowRight?: boolean
  isHovered?: boolean
  isSelected?: boolean
  children?: ReactNode
}) {
  const bg = isSelected
    ? "var(--color-accent-light)"
    : isHovered
      ? "var(--color-bg-subtle)"
      : "var(--color-bg-surface)"

  return (
    <div
      className="relative flex-shrink-0 flex items-center border-b border-r overflow-hidden"
      style={{
        width,
        minWidth: width,
        maxWidth: width,
        height: ROW_HEIGHT,
        background: bg,
        borderColor: "var(--color-border)",
        position: sticky ? "sticky" : undefined,
        left: sticky ? left : undefined,
        zIndex: sticky ? 2 : undefined,
        boxShadow: shadowRight
          ? "4px 0 8px -2px rgba(0,0,0,0.06)"
          : undefined,
        transition: "background 0.08s ease",
      }}
    >
      {children}
    </div>
  )
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function SkeletonRow({ columns, colWidths }: { columns: ColumnDef<unknown>[], colWidths: number[] }) {
  return (
    <div className="flex flex-row">
      <div
        className="flex-shrink-0 border-b border-r"
        style={{ width: CHECKBOX_WIDTH, minWidth: CHECKBOX_WIDTH, height: ROW_HEIGHT, borderColor: "var(--color-border)" }}
      />
      {columns.map((col, i) => (
        <div
          key={col.key}
          className="flex-shrink-0 flex items-center border-b border-r px-2"
          style={{ width: colWidths[i], minWidth: colWidths[i], height: ROW_HEIGHT, borderColor: "var(--color-border)" }}
        >
          <div
            className="h-3 rounded-full animate-pulse"
            style={{
              width: `${40 + Math.random() * 40}%`,
              background: "var(--color-border)",
            }}
          />
        </div>
      ))}
      <div className="flex-1 border-b" style={{ borderColor: "var(--color-border)" }} />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RecordTable<T extends { id: string }>({
  columns,
  rows,
  onRowClick,
  onCellEdit,
  onAddRow,
  onAddColumn,
  isLoading,
}: RecordTableProps<T>) {
  const [colWidths, setColWidths] = useState<number[]>(
    () => columns.map((c) => c.width ?? 160)
  )
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [sort, setSort] = useState<SortState>(null)
  const [editingCell, setEditingCell] = useState<{ rowId: string; key: string; draft: string } | null>(null)
  const [localEdits, setLocalEdits] = useState<Record<string, Record<string, unknown>>>({})

  const commitEdit = useCallback((rowId: string, key: string, draft: string) => {
    setEditingCell(null)
    setLocalEdits((prev) => ({ ...prev, [rowId]: { ...prev[rowId], [key]: draft } }))
    onCellEdit?.(rowId, key, draft)
  }, [onCellEdit])

  const resizeRef = useRef<{
    colIndex: number
    startX: number
    startWidth: number
  } | null>(null)

  const onResizeStart = useCallback(
    (e: React.MouseEvent, colIndex: number) => {
      e.preventDefault()
      e.stopPropagation()
      resizeRef.current = {
        colIndex,
        startX: e.clientX,
        startWidth: colWidths[colIndex],
      }
      const onMouseMove = (e: MouseEvent) => {
        if (!resizeRef.current) return
        const { colIndex, startX, startWidth } = resizeRef.current
        const delta = e.clientX - startX
        setColWidths((prev) => {
          const next = [...prev]
          next[colIndex] = Math.max(MIN_COL_WIDTH, startWidth + delta)
          return next
        })
      }
      const onMouseUp = () => {
        resizeRef.current = null
        document.removeEventListener("mousemove", onMouseMove)
        document.removeEventListener("mouseup", onMouseUp)
      }
      document.addEventListener("mousemove", onMouseMove)
      document.addEventListener("mouseup", onMouseUp)
    },
    [colWidths]
  )

  const handleSort = (key: string) => {
    setSort((prev) => {
      if (prev?.key === key) {
        return prev.dir === "asc" ? { key, dir: "desc" } : null
      }
      return { key, dir: "asc" }
    })
  }

  const sortedRows = sort
    ? [...rows].sort((a, b) => {
        const av = (a as Record<string, unknown>)[sort.key]
        const bv = (b as Record<string, unknown>)[sort.key]
        const cmp = String(av ?? "").localeCompare(String(bv ?? ""))
        return sort.dir === "asc" ? cmp : -cmp
      })
    : rows

  const allSelected = rows.length > 0 && selectedRows.size === rows.length
  const someSelected = selectedRows.size > 0 && !allSelected

  const toggleAll = () => {
    if (allSelected) setSelectedRows(new Set())
    else setSelectedRows(new Set(rows.map((r) => r.id)))
  }

  const toggleRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Sticky column offset: checkbox sits at left=0, col[0] sits after checkbox
  const col0Left = CHECKBOX_WIDTH

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-auto" style={{ background: "var(--color-bg-surface)" }}>
        <div className="flex flex-col" style={{ minWidth: "100%", width: "max-content" }}>

          {/* ── Header row ── */}
          <div
            className="flex flex-row sticky top-0"
            style={{ zIndex: 4, background: "var(--color-bg-surface)" }}
          >
            {/* Checkbox header */}
            <HeaderCell width={CHECKBOX_WIDTH} sticky left={0}>
              <button
                onClick={toggleAll}
                className="flex items-center justify-center w-full h-full"
                style={{
                  color: allSelected
                    ? "var(--color-accent)"
                    : "var(--color-text-tertiary)",
                }}
              >
                {allSelected ? (
                  <CheckSquare size={13} weight="fill" />
                ) : (
                  <Square size={13} />
                )}
              </button>
            </HeaderCell>

            {/* Column headers */}
            {columns.map((col, i) => {
              const isFirst = i === 0
              const isSorted = sort?.key === col.key
              return (
                <HeaderCell
                  key={col.key}
                  width={colWidths[i]}
                  sticky={isFirst}
                  left={isFirst ? col0Left : undefined}
                  shadowRight={isFirst}
                  onClick={() => handleSort(col.key)}
                  onResizeStart={(e) => onResizeStart(e, i)}
                >
                  <div className="flex items-center gap-1 px-2 overflow-hidden min-w-0 flex-1">
                    {col.icon && (
                      <col.icon
                        size={12}
                        style={{ color: "var(--color-text-tertiary)", flexShrink: 0 }}
                      />
                    )}
                    <span
                      className="truncate font-medium"
                      style={{ fontSize: 12, color: "var(--color-text-secondary)" }}
                    >
                      {col.label}
                    </span>
                    {isSorted && (
                      sort!.dir === "asc" ? (
                        <ArrowUp size={10} style={{ color: "var(--color-text-tertiary)", flexShrink: 0 }} />
                      ) : (
                        <ArrowDown size={10} style={{ color: "var(--color-text-tertiary)", flexShrink: 0 }} />
                      )
                    )}
                  </div>
                </HeaderCell>
              )
            })}

            {/* Add column button */}
            <HeaderCell width={32} noRightBorder onClick={onAddColumn}>
              <div className="flex items-center justify-center w-full">
                <Plus size={12} style={{ color: "var(--color-text-tertiary)" }} />
              </div>
            </HeaderCell>

            {/* Fill remaining header width */}
            <div
              className="flex-1 border-b"
              style={{ borderColor: "var(--color-border)" }}
            />
          </div>

          {/* ── Rows ── */}
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <SkeletonRow key={i} columns={columns as ColumnDef<unknown>[]} colWidths={colWidths} />
              ))
            : sortedRows.map((row) => {
                const isSelected = selectedRows.has(row.id)
                const isHovered = hoveredRow === row.id

                return (
                  <div
                    key={row.id}
                    className="flex flex-row group"
                    style={{ cursor: onRowClick ? "pointer" : "default" }}
                    onMouseEnter={() => setHoveredRow(row.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    onClick={() => onRowClick?.(row)}
                  >
                    {/* Checkbox cell */}
                    <DataCell
                      width={CHECKBOX_WIDTH}
                      sticky
                      left={0}
                      isHovered={isHovered}
                      isSelected={isSelected}
                    >
                      <button
                        onClick={(e) => toggleRow(row.id, e)}
                        className={cn(
                          "flex items-center justify-center w-full h-full transition-opacity duration-100",
                          !isSelected && !isHovered && "opacity-0"
                        )}
                        style={{
                          color: isSelected
                            ? "var(--color-accent)"
                            : "var(--color-text-tertiary)",
                        }}
                      >
                        {isSelected ? (
                          <CheckSquare size={13} weight="fill" />
                        ) : (
                          <Square size={13} />
                        )}
                      </button>
                    </DataCell>

                    {/* Data cells */}
                    {columns.map((col, i) => {
                      const isFirst = i === 0
                      const rawValue = (row as Record<string, unknown>)[col.key]
                      const displayValue = localEdits[row.id]?.[col.key] ?? rawValue
                      const isEditing = editingCell?.rowId === row.id && editingCell?.key === col.key
                      const canEdit = col.editable && !!onCellEdit
                      return (
                        <DataCell
                          key={col.key}
                          width={colWidths[i]}
                          sticky={isFirst}
                          left={isFirst ? col0Left : undefined}
                          shadowRight={isFirst}
                          isHovered={isHovered}
                          isSelected={isSelected}
                        >
                          {isEditing ? (
                            <input
                              autoFocus
                              value={editingCell.draft}
                              onChange={(e) => setEditingCell({ ...editingCell, draft: e.target.value })}
                              onBlur={() => commitEdit(row.id, col.key, editingCell.draft)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === "Tab") e.currentTarget.blur()
                                if (e.key === "Escape") setEditingCell(null)
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full h-full bg-transparent outline-none px-2"
                              style={{
                                fontSize: 13,
                                color: isFirst ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                                fontWeight: isFirst ? 500 : 400,
                              }}
                            />
                          ) : (
                            <div
                              className="px-2 w-full truncate"
                              style={{
                                fontSize: 13,
                                color: isFirst ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                                fontWeight: isFirst ? 500 : 400,
                                cursor: canEdit ? "text" : "default",
                              }}
                              onClick={canEdit ? (e) => {
                                e.stopPropagation()
                                setEditingCell({ rowId: row.id, key: col.key, draft: displayValue != null ? String(displayValue) : "" })
                              } : undefined}
                            >
                              {col.render
                                ? col.render(displayValue, row)
                                : displayValue != null
                                  ? String(displayValue)
                                  : ""}
                            </div>
                          )}
                        </DataCell>
                      )
                    })}

                    {/* Fill remaining row width */}
                    <div
                      className="flex-1 border-b"
                      style={{
                        borderColor: "var(--color-border)",
                        background: isSelected
                          ? "var(--color-accent-light)"
                          : isHovered
                            ? "var(--color-bg-subtle)"
                            : "var(--color-bg-surface)",
                        transition: "background 0.08s ease",
                      }}
                    />
                  </div>
                )
              })}

          {/* ── Add row ── */}
          {onAddRow && !isLoading && (
            <button
              onClick={onAddRow}
              className="flex items-center gap-2 px-3 text-left w-full border-b transition-colors"
              style={{
                height: ROW_HEIGHT,
                borderColor: "var(--color-border)",
                color: "var(--color-text-tertiary)",
                fontSize: 12,
                background: "transparent",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--color-bg-subtle)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <Plus size={12} />
              Add record
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
