"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { House, Storefront, Robot, Graph, GearSix, SignOut } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { useSession, signOut } from "@/lib/auth-client"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"

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
}: {
  href: string
  icon: React.ElementType
  label: string
}) {
  const pathname = usePathname()
  const active = useActiveItem(href, pathname)

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={href}
            className={cn(
              "flex items-center justify-center rounded-[8px] transition-all duration-100 px-0 py-2 w-full",
              active
                ? "text-[var(--color-text-primary)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-base)]"
            )}
            style={{
              fontWeight: active ? 500 : 360,
              fontSize: "14px"
            }}
            aria-label={label}
          />
        }
      >
        <Icon size={20} weight={active ? "fill" : "regular"} className={active ? "text-[var(--color-accent-foreground)]" : ""} />
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={12}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

function OrgLogo() {
  return (
    <div className="flex items-center justify-center py-4 w-full px-0">
      <div className="w-8 h-8 rounded-[8px] overflow-hidden shrink-0 border border-black/[0.04] shadow-sm">
        <Image
          src="/logo.png"
          alt="Basics"
          width={32}
          height={32}
          className="w-full h-full object-cover"
          priority
        />
      </div>
    </div>
  )
}

function UserMenu() {
  const router = useRouter()
  const { data, isPending } = useSession()

  const user = data?.user
  const name = user?.name ?? ""
  const initials = name
    ? name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : "…"

  async function handleSignOut() {
    await signOut()
    router.push("/login")
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="flex items-center justify-center w-full rounded-[8px] hover:bg-[var(--color-bg-base)] transition-colors focus:outline-none p-2"
          aria-label="Account menu"
        >
          <div
            className="flex items-center justify-center shrink-0 w-8 h-8 rounded-full text-white text-[11px] font-semibold shadow-sm"
            style={{ background: "var(--color-accent-foreground)" }}
          >
            {isPending ? "…" : initials}
          </div>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="right"
          sideOffset={14}
          align="end"
          className="z-50 min-w-[220px] rounded-[12px] bg-white border border-[#E4E2DE] shadow-lg p-1.5 outline-none"
        >
          <div className="px-3 py-2.5 mb-1.5">
            <p className="text-[13px] font-medium text-[var(--color-text-primary)]">{name || "Account"}</p>
            {user?.email && <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5 truncate">{user.email}</p>}
          </div>
          
          <DropdownMenu.Separator className="h-px bg-[#F0EEEB] mx-1 my-1" />

          <DropdownMenu.Item
            onSelect={() => router.push("/settings")}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-[13px] text-zinc-600 cursor-pointer outline-none hover:bg-zinc-50 transition-colors"
          >
            <GearSix size={15} weight="regular" />
            Settings
          </DropdownMenu.Item>

          <DropdownMenu.Item
            onSelect={handleSignOut}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-[13px] text-[#E53E3E] cursor-pointer outline-none hover:bg-red-50 transition-colors"
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
    <TooltipProvider delay={200}>
      <aside
        className="h-screen flex flex-col fixed left-0 top-0 z-50 border-r w-[68px] items-center px-2 py-4"
        style={{
          background: "var(--color-bg-sidebar)",
          borderColor: "var(--color-border)",
        }}
      >
        <OrgLogo />

        <nav className="flex flex-col gap-1 w-full items-center my-auto">
          {NAV_ITEMS.map((item) => (
            <SidebarItem key={item.href} {...item} />
          ))}
        </nav>

        <div className="w-full">
          <UserMenu />
        </div>
      </aside>
    </TooltipProvider>
  )
}
