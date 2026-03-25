"use client"

import { Users, Buildings, CurrencyDollar, AddressBook, ArrowLeft } from "@phosphor-icons/react"
import Link from "next/link"
import { PageTransition } from "@/components/page-transition"
import { AppHeader } from "@/components/app-header"
import { AppTile } from "@/components/launchpad/app-tile"

const CRM_APPS = [
  {
    name: "Contacts",
    href: "/crm/contacts",
    icon: <Users size={32} weight="fill" className="text-white" />,
    iconBg: "bg-emerald-500",
    subtitle: "15 records",
  },
  {
    name: "Companies",
    href: "/crm/companies",
    icon: <Buildings size={32} weight="fill" className="text-white" />,
    iconBg: "bg-emerald-600",
    subtitle: "12 records",
  },
  {
    name: "Deals",
    href: "/crm/deals",
    icon: <CurrencyDollar size={32} weight="fill" className="text-white" />,
    iconBg: "bg-emerald-400",
    subtitle: "$240k pipeline",
  },
]

export default function CRMPage() {
  return (
    <>
      <AppHeader
        breadcrumb={[
          { label: "Workspace", href: "/" },
          { label: "CRM" },
        ]}
      />
      <PageTransition>
        <div className="flex-1 p-8" style={{ background: "var(--color-bg-base)" }}>
          <h1 className="text-xl font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
            CRM
          </h1>
          <p className="text-sm mb-8" style={{ color: "var(--color-text-secondary)" }}>
            Your customer relationship data
          </p>

          <div className="flex flex-wrap gap-x-8 gap-y-10 shrink-0 mt-8">
            {CRM_APPS.map((app) => (
              <AppTile
                key={app.name}
                name={app.name}
                subtitle={app.subtitle}
                href={app.href}
                icon={app.icon}
                iconBg={app.iconBg}
              />
            ))}
          </div>
        </div>
      </PageTransition>
    </>
  )
}
