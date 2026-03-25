"use client"

import { useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import { PageTransition } from "@/components/page-transition"
import { ContactsTable } from "@/apps/crm/components/ContactsTable"
import { FilterPopover } from "@/apps/crm/components/FilterPopover"
import { useRecords } from "@/apps/crm/hooks/useRecords"
import { useContactsFilter, type FilterRule } from "@/apps/crm/hooks/useContactsFilter"
import { toContact } from "@/apps/crm/types"
import { MagnifyingGlass, Export, X } from "@phosphor-icons/react"

function exportContactsCSV(contacts: ReturnType<typeof toContact>[]) {
  const HEADERS = ["Name", "Email", "Phone", "Company", "Status", "Created"]
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const rows = [
    HEADERS.map(escape).join(","),
    ...contacts.map((c) =>
      [c.name, c.email, c.phone ?? "", c.company ?? "", c.status ?? "", c.createdAt ?? ""]
        .map(escape).join(",")
    ),
  ].join("\n")
  const blob = new Blob([rows], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function ContactsPage() {
  const router = useRouter()
  const { data: allContacts, loading } = useRecords("contacts", toContact)
  const [search, setSearch] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)
  const [filters, setFilters] = useState<FilterRule[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)

  const visible = useContactsFilter(allContacts, search, filters)

  const openSearch = useCallback(() => {
    setSearchOpen(true)
    setTimeout(() => searchInputRef.current?.focus(), 0)
  }, [])

  const closeSearch = useCallback(() => {
    setSearch("")
    setSearchOpen(false)
  }, [])

  return (
    <>
      <AppHeader
        breadcrumb={[
          { label: "Workspace", href: "/" },
          { label: "CRM", href: "/crm" },
          { label: "Contacts" },
        ]}
        actions={
          <div className="flex items-center gap-1">
            <HeaderButton
              icon={<MagnifyingGlass size={14} weight={searchOpen ? "fill" : "regular"} />}
              label="Search"
              active={searchOpen}
              onClick={openSearch}
            />
            <FilterPopover filters={filters} onChange={setFilters} />
            <HeaderButton
              icon={<Export size={14} />}
              label="Export"
              onClick={() => exportContactsCSV(visible)}
            />
          </div>
        }
      />
      <PageTransition>
        <div className="flex flex-col" style={{ height: "calc(100vh - 48px)", background: "var(--color-bg-surface)" }}>
          <div className="flex items-center px-4 shrink-0 border-b" style={{ height: 40, borderColor: "var(--color-border)" }}>
            {searchOpen ? (
              <div className="flex items-center gap-2 flex-1">
                <MagnifyingGlass size={13} style={{ color: "var(--color-text-tertiary)", flexShrink: 0 }} />
                <input
                  ref={searchInputRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && closeSearch()}
                  placeholder="Search contacts…"
                  className="flex-1 bg-transparent outline-none"
                  style={{ fontSize: 13, color: "var(--color-text-primary)" }}
                />
                <button
                  onClick={closeSearch}
                  className="flex items-center justify-center rounded transition-colors shrink-0"
                  style={{ width: 20, height: 20, color: "var(--color-text-tertiary)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-subtle)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <X size={11} />
                </button>
              </div>
            ) : (
              <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                {loading ? "Loading…" : visible.length === allContacts.length
                  ? `${allContacts.length} contacts`
                  : `${visible.length} of ${allContacts.length} contacts`}
              </span>
            )}
          </div>
          <ContactsTable
            contacts={visible}
            isLoading={loading}
            onRowClick={(c) => router.push(`/crm/contacts/${c.id}`)}
            onAddRow={() => console.log("add contact")}
          />
        </div>
      </PageTransition>
    </>
  )
}

function HeaderButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 h-7 rounded text-xs font-medium transition-colors"
      style={{ color: active ? "var(--color-accent)" : "var(--color-text-secondary)", background: "transparent" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-subtle)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {icon}
      {label}
    </button>
  )
}
