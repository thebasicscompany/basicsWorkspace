import { AddressBook, Users, Buildings, CurrencyDollar } from "@phosphor-icons/react"
import type { AppManifest } from "@/apps/_types"

export const crmApp = {
  slug: "crm",
  name: "CRM",
  href: "/crm",
  icon: AddressBook,
  iconColor: "text-white",
  iconBg: "bg-teal-600",
  iconWeight: "fill",
  isGroup: true,
  order: 2,
  subApps: [
    { slug: "contacts",  name: "Contacts",  href: "/crm/contacts",  icon: Users,          iconColor: "text-white" },
    { slug: "companies", name: "Companies", href: "/crm/companies", icon: Buildings,      iconColor: "text-white" },
    { slug: "deals",     name: "Deals",     href: "/crm/deals",     icon: CurrencyDollar, iconColor: "text-white" },
    { slug: "crm-root",  name: "CRM",       href: "/crm",           icon: AddressBook,    iconColor: "text-white" },
  ],
} satisfies AppManifest
