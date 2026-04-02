"use client"

import { AppHeader } from "@/components/app-header"
import { PageTransition } from "@/components/page-transition"
import { SettingsApp } from "@/apps/settings/components/SettingsApp"

export default function SettingsPage() {
  return (
    <>
      <AppHeader breadcrumb={[{ label: "Workspace", href: "/" }, { label: "Settings" }]} />
      <PageTransition>
        <div
          className="overflow-hidden"
          style={{ height: "calc(100vh - 48px)", background: "var(--color-bg-base)" }}
        >
          <SettingsApp />
        </div>
      </PageTransition>
    </>
  )
}
