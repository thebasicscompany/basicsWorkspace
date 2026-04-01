"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { House, Storefront, Robot, Graph, GearSix, SignOut, Moon, Sun, CaretLeft, CaretRight } from "@phosphor-icons/react"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { useSession, signOut } from "@/lib/auth-client"

// ── Sidebar collapse context ─────────────────────────────────────────────────

const SidebarContext = createContext<{ collapsed: boolean; toggle: () => void }>({
  collapsed: false,
  toggle: () => {},
})

export function useSidebar() {
  return useContext(SidebarContext)
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <SidebarContext.Provider value={{ collapsed, toggle: () => setCollapsed((c) => !c) }}>
      {children}
    </SidebarContext.Provider>
  )
}

const NAV_ITEMS = [
  { href: "/", icon: House, label: "Home" },
  { href: "/shop", icon: Storefront, label: "Shop" },
  { href: "/agent", icon: Robot, label: "Agent" },
  { href: "/context", icon: Graph, label: "Context" },
] as const

const APP_ROUTES = ["/crm", "/automations", "/tasks", "/notes", "/meetings", "/meeting-assistant"]

function useActiveItem(href: string, pathname: string): boolean {
  if (href === "/") {
    return pathname === "/" || APP_ROUTES.some((r) => pathname.startsWith(r))
  }
  return pathname.startsWith(href)
}

function SidebarItem({
  href,
  icon: Icon,
  label,
  collapsed,
}: {
  href: string
  icon: React.ElementType
  label: string
  collapsed?: boolean
}) {
  const pathname = usePathname()
  const active = useActiveItem(href, pathname)

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center rounded-[8px] transition-all duration-100",
        collapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2",
        active
          ? "text-[var(--color-text-primary)]"
          : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      )}
      style={{
        fontWeight: active ? 500 : 360,
        fontSize: "14px"
      }}
      aria-label={label}
      title={collapsed ? label : undefined}
    >
      <Icon size={20} weight={active ? "fill" : "regular"} className={active ? "text-[var(--color-accent-foreground)]" : ""} />
      {!collapsed && <span>{label}</span>}
    </Link>
  )
}

function OrgLogo() {
  const { collapsed, toggle } = useSidebar()
  return (
    <div className={cn(
      "flex items-center py-4 w-full",
      collapsed ? "justify-center px-0" : "justify-between px-3"
    )}>
      <div className="w-8 h-8 rounded-[8px] overflow-hidden shrink-0 border border-black/[0.04]">
        <Image
          src="/logo.png"
          alt="Basics"
          width={32}
          height={32}
          className="w-full h-full object-cover"
          priority
        />
      </div>
      {!collapsed && (
        <button
          onClick={toggle}
          className="flex items-center justify-center w-6 h-6 rounded-[6px] text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-base)] hover:text-[var(--color-text-secondary)] transition-colors"
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
        >
          <CaretLeft size={14} />
        </button>
      )}
    </div>
  )
}

function UserMenu() {
  const router = useRouter()
  const { data, isPending } = useSession()
  const { collapsed } = useSidebar()

  const user = data?.user
  const name = user?.name ?? ""
  const email = user?.email ?? ""
  const initials = name
    ? name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : "…"

  const { resolvedTheme, setTheme } = useTheme()

  async function handleSignOut() {
    await signOut()
    router.push("/login")
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            "flex items-center w-full rounded-[8px] hover:bg-[var(--color-bg-base)] transition-colors text-left focus:outline-none",
            collapsed ? "justify-center p-2" : "gap-3 p-2"
          )}
          aria-label="Account menu"
        >
          <div
            className="flex items-center justify-center shrink-0 w-8 h-8 rounded-full text-white text-[11px] font-semibold"
            style={{ background: "var(--color-accent-foreground)" }}
          >
            {isPending ? "…" : initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-[var(--color-text-primary)]">
                {isPending ? "Loading..." : (name || "Account")}
              </p>
            </div>
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          sideOffset={8}
          align="start"
          className="z-50 min-w-[220px] rounded-[12px] bg-white dark:bg-[#1C1C1C] border border-[#E4E2DE] dark:border-[#2A2A2A] shadow-md p-1.5 outline-none"
        >
          <DropdownMenu.Item
            onSelect={() => router.push("/settings")}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-[13px] text-zinc-600 dark:text-zinc-300 cursor-pointer outline-none hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <GearSix size={15} weight="regular" />
            Settings
          </DropdownMenu.Item>

          <DropdownMenu.Item
            onSelect={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-[13px] text-zinc-600 dark:text-zinc-300 cursor-pointer outline-none hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            {resolvedTheme === "dark" ? <Sun size={15} weight="regular" /> : <Moon size={15} weight="regular" />}
            {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px bg-[#F0EEEB] dark:bg-[#2A2A2A] mx-1 my-1" />

          <DropdownMenu.Item
            onSelect={handleSignOut}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-[13px] text-[#E53E3E] cursor-pointer outline-none hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <SignOut size={15} weight="regular" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export function WorkspaceSidebar() {
  const { collapsed, toggle } = useSidebar()

  return (
    <aside
      className={cn(
        "h-screen flex flex-col fixed left-0 top-0 z-50 border-r transition-all duration-200",
        collapsed ? "w-[68px] items-center px-2 py-4" : "w-[232px] p-4"
      )}
      style={{
        background: "var(--color-bg-sidebar)",
        borderColor: "var(--color-border)",
      }}
    >
      <OrgLogo />

      {!collapsed && (
        <div className="mt-6 mb-2 px-3">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--color-text-tertiary)]">
            Main Menu
          </p>
        </div>
      )}

      {collapsed && <div className="mt-4" />}

      <nav className={cn("flex flex-col gap-1", collapsed && "w-full items-center")}>
        {NAV_ITEMS.map((item) => (
          <SidebarItem key={item.href} {...item} collapsed={collapsed} />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-1 w-full">
        {collapsed && (
          <button
            onClick={toggle}
            className="flex items-center justify-center w-full py-2 rounded-[8px] text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-base)] hover:text-[var(--color-text-secondary)] transition-colors"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <CaretRight size={14} />
          </button>
        )}
        <UserMenu />
      </div>
    </aside>
  )
}
