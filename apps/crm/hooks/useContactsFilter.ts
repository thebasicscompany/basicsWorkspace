import { useMemo } from "react"
import type { Contact } from "@/apps/crm/components/ContactsTable"

// ─── Types ────────────────────────────────────────────────────────────────────

export type FilterField = "name" | "email" | "phone" | "company" | "status"
export type FilterOperator = "contains" | "not_contains" | "is" | "is_not"

export type FilterRule = {
  id: string
  field: FilterField
  operator: FilterOperator
  value: string
}

export const FILTER_FIELDS: { value: FilterField; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "company", label: "Company" },
  { value: "status", label: "Status" },
  { value: "phone", label: "Phone" },
]

export const FILTER_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "is", label: "is" },
  { value: "is_not", label: "is not" },
]

// ─── Matching logic ───────────────────────────────────────────────────────────

function matchRule(contact: Contact, rule: FilterRule): boolean {
  if (!rule.value.trim()) return true

  const raw = contact[rule.field] ?? ""
  const haystack = raw.toLowerCase()
  const needle = rule.value.toLowerCase().trim()

  switch (rule.operator) {
    case "contains":
      return haystack.includes(needle)
    case "not_contains":
      return !haystack.includes(needle)
    case "is":
      return haystack === needle
    case "is_not":
      return haystack !== needle
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useContactsFilter(
  contacts: Contact[],
  search: string,
  filters: FilterRule[]
): Contact[] {
  return useMemo(() => {
    let result = contacts

    // Search: matches name, email, or company
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.company ?? "").toLowerCase().includes(q)
      )
    }

    // Filter rules: all rules must pass (AND)
    const activeRules = filters.filter((r) => r.value.trim())
    if (activeRules.length > 0) {
      result = result.filter((c) => activeRules.every((r) => matchRule(c, r)))
    }

    return result
  }, [contacts, search, filters])
}
