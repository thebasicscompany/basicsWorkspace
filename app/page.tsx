"use client"

import { useRouter } from "next/navigation"
import { Plus, GoogleLogo, SlackLogo, GithubLogo, NotionLogo, ChartBar } from "@phosphor-icons/react"
import { PageTransition } from "@/components/page-transition"
import { AppTile } from "@/components/launchpad/app-tile"
import { ConnectionTile } from "@/components/launchpad/connection-tile"
import { SectionLabel } from "@/components/section-label"
import { INSTALLED_APPS, type AppManifest } from "@/apps/_registry"

// ─── Connections (will get their own registry later) ──────────
const CONNECTIONS = [
  { name: "Gmail",   connected: true,  icon: <GoogleLogo size={32} weight="fill" className="text-white" />, iconBg: "bg-red-500" },
  { name: "Slack",   connected: true,  icon: <SlackLogo  size={32} weight="fill" className="text-white" />, iconBg: "bg-purple-600" },
  { name: "Notion",  connected: true,  icon: <NotionLogo size={32} weight="fill" className="text-white" />, iconBg: "bg-zinc-800" },
  { name: "GitHub",  connected: true,  icon: <GithubLogo size={32} weight="fill" className="text-white" />, iconBg: "bg-zinc-900" },
  { name: "HubSpot", connected: false, icon: <ChartBar   size={32} weight="fill" className="text-white" />, iconBg: "bg-orange-500" },
]

// ─── Render icon from manifest ─────────────────────────────────
function renderAppIcon(app: AppManifest, size = 32) {
  const Icon = app.icon
  return <Icon size={size} weight={app.iconWeight ?? "fill"} className={app.iconColor} />
}

function renderGroupIcons(app: AppManifest) {
  if (!app.subApps) return undefined
  return app.subApps.slice(0, 4).map((sub) => {
    const Icon = sub.icon
    return <Icon key={sub.slug} size={11} className={sub.iconColor} />
  })
}

// ─── Page ──────────────────────────────────────────────────────
export default function LaunchpadPage() {
  const router = useRouter()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  return (
    <PageTransition>
      <div className="relative flex flex-col p-10 h-screen overflow-hidden">
        {/* Ambient Mesh Background */}
        <div className="absolute inset-0 -z-10 bg-[#F9F7F4] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(#D4D2CE_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#2D8653] opacity-[0.08] blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500 opacity-[0.06] blur-[140px]" />
          <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-amber-500 opacity-[0.06] blur-[120px]" />
        </div>

        <div className="relative z-10 flex flex-col h-full">
          <h1
            className="font-semibold mb-5 shrink-0"
            style={{ fontSize: "20px", color: "var(--color-text-primary)" }}
          >
            {greeting}, <span style={{ color: "#2D8653" }}>Arav.</span>
          </h1>

          <SectionLabel className="mb-4">Your Apps</SectionLabel>
          <div className="flex flex-wrap gap-x-8 gap-y-10 shrink-0">
            {INSTALLED_APPS.map((app) => (
              <AppTile
                key={app.slug}
                name={app.name}
                subtitle={app.subtitle}
                href={app.href}
                icon={renderAppIcon(app)}
                groupIcons={renderGroupIcons(app)}
                iconBg={app.iconBg}
              />
            ))}
            <AppTile
              name="Add App"
              href="/shop"
              icon={<Plus size={24} className="text-zinc-500 group-hover:text-zinc-600 transition-colors" />}
              dashed
            />
          </div>

          <div className="my-8 border-t shrink-0 opacity-50" style={{ borderColor: "var(--color-border-strong)" }} />

          <SectionLabel className="mb-4">Connections</SectionLabel>
          <div className="flex flex-wrap gap-x-8 gap-y-10 shrink-0">
            {CONNECTIONS.map((conn) => (
              <ConnectionTile
                key={conn.name}
                name={conn.name}
                icon={conn.icon}
                connected={conn.connected}
                iconBg={conn.iconBg}
              />
            ))}
            <ConnectionTile
              name="Add More"
              icon={<Plus size={24} className="text-zinc-500 group-hover:text-zinc-600 transition-colors" />}
              connected={false}
              onClick={() => router.push("/shop")}
              dashed
            />
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
