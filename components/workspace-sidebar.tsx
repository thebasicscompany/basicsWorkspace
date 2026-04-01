"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import * as Tooltip from "@radix-ui/react-tooltip"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { House, Storefront, Robot, Graph, GearSix, SignOut, Moon, Sun } from "@phosphor-icons/react"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { useSession, signOut } from "@/lib/auth-client"

const NAV_ITEMS = [
  { href: "/", icon: House, label: "Home" },
  { href: "/shop", icon: Storefront, label: "Shop" },
  { href: "/agent", icon: Robot, label: "Agent" },
  { href: "/context", icon: Graph, label: "Context" },
] as const

// Home is active on "/" and any app route (/crm, /automations, /tasks, etc.)
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
}: {
  href: string
  icon: React.ElementType
  label: string
}) {
  const pathname = usePathname()
  const active = useActiveItem(href, pathname)

  return (
    <Tooltip.Root delayDuration={400}>
      <Tooltip.Trigger asChild>
        <Link
          href={href}
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-[10px] transition-all duration-200",
            active
              ? "bg-[#EFF6FF] dark:bg-[rgba(59,130,246,0.12)]"
              : "text-[#9CA3AF] hover:text-[#6B7280] hover:bg-[#F5F7FA] dark:hover:bg-[#22252E]"
          )}
          style={
            active
              ? { color: "#2563EB" }
              : undefined
          }
          aria-label={label}
        >
          <Icon size={22} weight={active ? "fill" : "regular"} />
        </Link>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={8}
          className="z-50 rounded-[8px] bg-white dark:bg-[#1C1C1C] px-2.5 py-1.5 text-xs font-display text-zinc-700 dark:text-zinc-200 shadow-[0_4px_14px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_14px_rgba(0,0,0,0.3)] border border-black/[0.04] dark:border-white/[0.08]"
          style={{ fontWeight: 450 }}
        >
          {label}
          <Tooltip.Arrow className="fill-white dark:fill-[#1C1C1C]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

function OrgLogo() {
  return (
    <div
      className="w-10 h-10 rounded-[10px] overflow-hidden shrink-0 border border-black/[0.04]"
      style={{ boxShadow: "var(--shadow-squircle-white)" }}
    >
      <Image
        src="/logo.png"
        alt="Basics"
        width={40}
        height={40}
        className="w-full h-full object-cover"
        priority
      />
    </div>
  )
}

function UserMenu() {
  const router = useRouter()
  const { data, isPending } = useSession()

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
          className="flex items-center justify-center w-10 h-10 rounded-[10px] text-white text-sm font-semibold select-none cursor-pointer hover:opacity-90 transition-all focus:outline-none"
          style={{
            background: "#2563EB",
            boxShadow: "var(--shadow-squircle-green)"
          }}
          aria-label="Account menu"
        >
          {isPending ? "…" : initials}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="right"
          sideOffset={10}
          align="end"
          className="z-50 min-w-[220px] rounded-[12px] bg-white dark:bg-[#1C1C1C] border border-[#E4E2DE] dark:border-[#2A2A2A] shadow-[0_8px_30px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] p-1.5 outline-none"
        >
          {/* User info header */}
          <div className="px-2.5 py-2 mb-1">
            {isPending ? (
              <div className="space-y-1.5">
                <div className="h-3 w-24 rounded bg-zinc-100 animate-pulse" />
                <div className="h-2.5 w-36 rounded bg-zinc-100 animate-pulse" />
              </div>
            ) : (
              <>
                <p className="text-[13px] font-semibold text-[#1A1A1A] dark:text-[#F0F0F0] leading-tight">{name || "—"}</p>
                <p className="text-[11px] text-[#9B9B9B] dark:text-[#71717A] mt-0.5 leading-tight">{email || "—"}</p>
              </>
            )}
          </div>

          <DropdownMenu.Separator className="h-px bg-[#F0EEEB] dark:bg-[#2A2A2A] mx-1 mb-1" />

          <DropdownMenu.Item
            onSelect={() => router.push("/settings")}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-[13px] text-zinc-600 dark:text-zinc-300 cursor-pointer outline-none select-none hover:bg-zinc-50 dark:hover:bg-zinc-800 data-[highlighted]:bg-zinc-50 dark:data-[highlighted]:bg-zinc-800 transition-colors"
          >
            <GearSix size={15} weight="regular" />
            Settings
          </DropdownMenu.Item>

          <DropdownMenu.Item
            onSelect={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-[13px] text-zinc-600 dark:text-zinc-300 cursor-pointer outline-none select-none hover:bg-zinc-50 dark:hover:bg-zinc-800 data-[highlighted]:bg-zinc-50 dark:data-[highlighted]:bg-zinc-800 transition-colors"
          >
            {resolvedTheme === "dark" ? <Sun size={15} weight="regular" /> : <Moon size={15} weight="regular" />}
            {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px bg-[#F0EEEB] dark:bg-[#2A2A2A] mx-1 my-1" />

          <DropdownMenu.Item
            onSelect={handleSignOut}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-[13px] text-[#E53E3E] cursor-pointer outline-none select-none hover:bg-red-50 dark:hover:bg-red-950/30 data-[highlighted]:bg-red-50 dark:data-[highlighted]:bg-red-950/30 transition-colors"
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
  return (
    <Tooltip.Provider>
      <aside
        className="w-16 h-screen flex flex-col items-center py-4 fixed left-0 top-0 z-50 border-r"
        style={{
          background: "var(--color-bg-sidebar)",
          borderColor: "var(--color-border)",
          boxShadow: "1px 0 10px rgba(0,0,0,0.03)"
        }}
      >
        <OrgLogo />

        <nav className="flex-1 flex flex-col items-center justify-center gap-1">
          {NAV_ITEMS.map((item) => (
            <SidebarItem key={item.href} {...item} />
          ))}
        </nav>

        <UserMenu />
      </aside>
    </Tooltip.Provider>
  )
}
