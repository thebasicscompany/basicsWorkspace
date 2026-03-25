"use client"

import { useId } from "react"
import * as Popover from "@radix-ui/react-popover"
import { Funnel, Plus, X } from "@phosphor-icons/react"
import {
  FILTER_FIELDS,
  FILTER_OPERATORS,
  type FilterRule,
} from "@/apps/crm/hooks/useContactsFilter"

// ─── Shared select style ──────────────────────────────────────────────────────

const SELECT_STYLE: React.CSSProperties = {
  height: 28,
  paddingLeft: 8,
  paddingRight: 24,
  fontSize: 12,
  border: "1px solid var(--color-border)",
  borderRadius: 6,
  background: "var(--color-bg-surface)",
  color: "var(--color-text-primary)",
  outline: "none",
  cursor: "pointer",
  appearance: "none",
  WebkitAppearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23A1A1AA' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 8px center",
}

const INPUT_STYLE: React.CSSProperties = {
  height: 28,
  paddingLeft: 8,
  paddingRight: 8,
  fontSize: 12,
  border: "1px solid var(--color-border)",
  borderRadius: 6,
  background: "var(--color-bg-surface)",
  color: "var(--color-text-primary)",
  outline: "none",
  width: "100%",
  minWidth: 0,
}

// ─── Component ────────────────────────────────────────────────────────────────

type FilterPopoverProps = {
  filters: FilterRule[]
  onChange: (filters: FilterRule[]) => void
}

export function FilterPopover({ filters, onChange }: FilterPopoverProps) {
  const uid = useId()
  const activeCount = filters.filter((r) => r.value.trim()).length

  const addRule = () => {
    onChange([
      ...filters,
      {
        id: `${uid}-${Date.now()}`,
        field: "name",
        operator: "contains",
        value: "",
      },
    ])
  }

  const updateRule = (id: string, patch: Partial<FilterRule>) => {
    onChange(filters.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const removeRule = (id: string) => {
    onChange(filters.filter((r) => r.id !== id))
  }

  const clearAll = () => onChange([])

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className="relative flex items-center gap-1.5 px-2.5 h-7 rounded text-xs font-medium transition-colors"
          style={{ color: activeCount > 0 ? "var(--color-accent)" : "var(--color-text-secondary)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--color-bg-subtle)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <Funnel size={14} weight={activeCount > 0 ? "fill" : "regular"} />
          Filter
          {activeCount > 0 && (
            <span
              className="flex items-center justify-center rounded-full text-white"
              style={{
                width: 16,
                height: 16,
                fontSize: 10,
                fontWeight: 600,
                background: "var(--color-accent)",
              }}
            >
              {activeCount}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          style={{
            width: 440,
            background: "var(--color-bg-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 10,
            boxShadow: "var(--shadow-lg)",
            zIndex: 50,
            padding: 12,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <span
              style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}
            >
              Filters
            </span>
            {filters.length > 0 && (
              <button
                onClick={clearAll}
                style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}
                className="hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Rules */}
          {filters.length === 0 ? (
            <p
              className="text-center py-4"
              style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}
            >
              No filters applied
            </p>
          ) : (
            <div className="flex flex-col gap-2 mb-3">
              {filters.map((rule, i) => (
                <div key={rule.id} className="flex items-center gap-2">
                  {/* "Where" / "And" label */}
                  <span
                    className="shrink-0 w-8 text-right"
                    style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}
                  >
                    {i === 0 ? "Where" : "And"}
                  </span>

                  {/* Field */}
                  <select
                    style={{ ...SELECT_STYLE, width: 110, flexShrink: 0 }}
                    value={rule.field}
                    onChange={(e) =>
                      updateRule(rule.id, { field: e.target.value as FilterRule["field"] })
                    }
                  >
                    {FILTER_FIELDS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>

                  {/* Operator */}
                  <select
                    style={{ ...SELECT_STYLE, width: 138, flexShrink: 0 }}
                    value={rule.operator}
                    onChange={(e) =>
                      updateRule(rule.id, {
                        operator: e.target.value as FilterRule["operator"],
                      })
                    }
                  >
                    {FILTER_OPERATORS.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>

                  {/* Value */}
                  <input
                    style={INPUT_STYLE}
                    placeholder="Value…"
                    value={rule.value}
                    onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                    autoFocus={i === filters.length - 1 && rule.value === ""}
                  />

                  {/* Remove */}
                  <button
                    onClick={() => removeRule(rule.id)}
                    className="shrink-0 flex items-center justify-center rounded transition-colors"
                    style={{ width: 22, height: 22, color: "var(--color-text-tertiary)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--color-bg-subtle)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add filter */}
          <button
            onClick={addRule}
            className="flex items-center gap-1.5 rounded px-2 transition-colors"
            style={{
              height: 28,
              fontSize: 12,
              color: "var(--color-text-secondary)",
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
            Add filter
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
