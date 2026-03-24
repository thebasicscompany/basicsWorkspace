"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import * as Tooltip from "@radix-ui/react-tooltip"
import { House, Storefront, Robot, Graph } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

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
              ? "shadow-sm"
              : "text-zinc-400 hover:text-zinc-600 hover:bg-[--color-bg-base]"
          )}
          style={
            active
              ? { 
                  background: "#E6F4ED", 
                  color: "#2D8653",
                  boxShadow: "var(--shadow-squircle-green-sm)"
                }
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
          className="z-50 rounded-[8px] bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-[0_4px_14px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)] border border-black/[0.04]"
        >
          {label}
          <Tooltip.Arrow className="fill-white" />
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

function UserAvatar() {
  return (
    <div
      className="flex items-center justify-center w-10 h-10 rounded-[10px] text-white text-sm font-semibold select-none shadow-sm cursor-pointer hover:opacity-90 transition-all"
      style={{ 
        background: "#2D8653",
        boxShadow: "var(--shadow-squircle-green)"
      }}
    >
      A
    </div>
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

        <UserAvatar />
      </aside>
    </Tooltip.Provider>
  )
}
