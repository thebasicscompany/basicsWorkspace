"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "@phosphor-icons/react"
import { PageTransition } from "@/components/page-transition"
import { AppTile } from "@/components/launchpad/app-tile"
import { ConnectionTile } from "@/components/launchpad/connection-tile"
import { SectionLabel } from "@/components/section-label"
import { INSTALLED_APPS, type AppManifest } from "@/apps/_registry"
import { PROVIDER_MAP } from "@/apps/shop/providers"

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

  const [connections, setConnections] = useState<{ provider: string }[]>([])

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch("/api/connections")
      if (res.ok) {
        const data = await res.json()
        setConnections(Array.isArray(data) ? data : [])
      }
    } catch { /* gateway not running */ }
  }, [])

  useEffect(() => { fetchConnections() }, [fetchConnections])

  return (
    <PageTransition>
      <div className="relative flex flex-col p-10 h-screen overflow-hidden">
        {/* Warm ambient background — soft radial washes */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" style={{ background: "var(--color-bg-base)" }}>
          <div className="absolute top-[-15%] left-[-5%] w-[45%] h-[45%] rounded-full opacity-[0.06] blur-[100px]" style={{ background: "#2D8653" }} />
          <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] rounded-full opacity-[0.04] blur-[120px]" style={{ background: "#C4956A" }} />
        </div>

        <div className="relative z-10 flex flex-col h-full editorial-stagger">
          {/* Editorial greeting — serif display */}
          <h1
            className="font-display mb-8 shrink-0"
            style={{ fontSize: "28px", lineHeight: 1.2, color: "var(--color-text-primary)", fontWeight: 400 }}
          >
            {greeting}, <span className="italic" style={{ color: "#2D8653" }}>Arav.</span>
          </h1>

          <SectionLabel className="mb-5">Your Apps</SectionLabel>
          <div className="flex flex-wrap gap-x-8 gap-y-10 shrink-0 editorial-stagger">
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

          <div className="my-10 shrink-0 opacity-30" style={{ borderTop: "1px solid var(--color-border-strong)" }} />

          <SectionLabel className="mb-5">Connections</SectionLabel>
          <div className="flex flex-wrap gap-x-8 gap-y-10 shrink-0 editorial-stagger">
            {connections.map((conn) => {
              const provider = PROVIDER_MAP.get(conn.provider)
              if (!provider) return null
              const Icon = provider.icon
              return (
                <ConnectionTile
                  key={provider.id}
                  name={provider.name}
                  icon={<Icon className="w-8 h-8" />}
                  connected
                />
              )
            })}
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
