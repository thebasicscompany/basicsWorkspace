"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  House, Lightning, AddressBook, CheckSquare,
  Note, VideoCamera, Graph, Cube, Storefront,
  Robot, GearSix,
} from "@phosphor-icons/react"
import {
  CommandDialog,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"

const NAV_ITEMS = [
  { name: "Home",            href: "/",              icon: House },
  { name: "Automations",     href: "/automations",   icon: Lightning },
  { name: "CRM",             href: "/crm",           icon: AddressBook },
  { name: "Contacts",        href: "/crm/contacts",  icon: AddressBook },
  { name: "Companies",       href: "/crm/companies", icon: AddressBook },
  { name: "Deals",           href: "/crm/deals",     icon: AddressBook },
  { name: "Tasks",           href: "/tasks",         icon: CheckSquare },
  { name: "Notes",           href: "/notes",         icon: Note },
  { name: "Meetings",        href: "/meetings",      icon: VideoCamera },
  { name: "Context",         href: "/context",       icon: Graph },
  { name: "Objects",         href: "/objects",       icon: Cube },
  { name: "Shop",            href: "/shop",          icon: Storefront },
  { name: "Agent",           href: "/agent",         icon: Robot },
  { name: "Settings",        href: "/settings",      icon: GearSix },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  function navigate(href: string) {
    setOpen(false)
    router.push(href)
  }

  const isMac = useMemo(() => {
    if (typeof navigator === "undefined") return true
    return navigator.platform?.toLowerCase().includes("mac") ?? navigator.userAgent?.includes("Mac")
  }, [])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command>
        <CommandInput placeholder="Search apps, actions..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Navigation">
            {NAV_ITEMS.map((item) => (
              <CommandItem
                key={item.href}
                onSelect={() => navigate(item.href)}
              >
                <item.icon size={16} weight="regular" />
                {item.name}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => navigate("/automations")}>
              <Lightning size={16} weight="regular" />
              New Automation
            </CommandItem>
            <CommandItem onSelect={() => navigate("/notes")}>
              <Note size={16} weight="regular" />
              New Note
            </CommandItem>
          </CommandGroup>

        </CommandList>
      </Command>
    </CommandDialog>
  )
}
