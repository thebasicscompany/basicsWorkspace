"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, Lightning, Clock, ArrowRight } from "@phosphor-icons/react"
import { PageTransition } from "@/components/page-transition"
import { AppTile } from "@/components/launchpad/app-tile"
import { ConnectionTile } from "@/components/launchpad/connection-tile"
import { INSTALLED_APPS, type AppManifest } from "@/apps/_registry"
import { PROVIDER_MAP } from "@/apps/shop/providers"
import { cn } from "@/lib/utils"


function renderAppIcon(app: AppManifest, size = 20) {
  const Icon = app.icon
  return <Icon size={size} weight={app.iconWeight ?? "fill"} className={app.iconColor} />
}

function renderGroupIcons(app: AppManifest) {
  if (!app.subApps) return undefined
  return app.subApps.slice(0, 4).map((sub) => {
    const Icon = sub.icon
    return <Icon key={sub.slug} size={10} className={sub.iconColor} />
  })
}

export default function LaunchpadPage() {
  const router = useRouter()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  const [connections, setConnections] = useState<{ provider: string }[]>([])
  const [recentWorkflows, setRecentWorkflows] = useState<
    { id: string; name: string; updatedAt: string; isDeployed?: boolean; runCount?: number }[]
  >([])

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch("/api/connections")
      if (res.ok) {
        const data = await res.json()
        setConnections(Array.isArray(data) ? data : [])
      }
    } catch { /* gateway not running */ }
  }, [])

  const fetchRecentWorkflows = useCallback(async () => {
    try {
      const res = await fetch("/api/workflows?limit=5")
      if (res.ok) {
        const data = await res.json()
        const wfs = data.workflows ?? data
        setRecentWorkflows(Array.isArray(wfs) ? wfs.slice(0, 5) : [])
      }
    } catch { /* ok */ }
  }, [])

  useEffect(() => {
    fetchConnections()
    fetchRecentWorkflows()
  }, [fetchConnections, fetchRecentWorkflows])

  return (
    <PageTransition>
      <div
        className="relative flex flex-col min-h-screen"
        style={{ background: "var(--color-bg-base)", padding: "24px 32px 112px" }}
      >
        <div className="relative z-10 flex flex-col h-full max-w-[968px] w-full mx-auto editorial-stagger">

          <div className="flex items-baseline justify-between mb-8">
            <h1 className="text-2xl font-medium tracking-tight" style={{ color: "var(--color-text-primary)" }}>
              {greeting}, Arav
            </h1>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-3 mb-10">
            <button
              onClick={() => router.push("/shop")}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-full text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
              style={{ background: "var(--color-accent)" }}
            >
              <Plus size={16} weight="bold" />
              Get new apps
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap hover:bg-bg-subtle"
              style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
            >
              <Lightning size={16} />
              Create workflow
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">

            {/* Main Content Area: Apps & Connections */}
            <div className="flex flex-col gap-10">

              {/* Your Apps Sector */}
              <section className="flex flex-col gap-4">
                <h2 className="text-lg font-medium tracking-tight mb-2" style={{ color: "var(--color-text-primary)" }}>Installed Apps</h2>
                <div className="flex flex-wrap gap-5">
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
                    name="Browse Catalog"
                    href="/shop"
                    icon={<Plus size={20} style={{ color: "var(--color-text-tertiary)" }} />}
                    dashed
                  />
                </div>
              </section>

              {/* Connections Sector */}
              <section className="flex flex-col gap-4">
                <h2 className="text-lg font-medium tracking-tight mb-2" style={{ color: "var(--color-text-primary)" }}>Connections</h2>
                <div className="flex flex-wrap gap-5">
                  {connections.map((conn) => {
                    const provider = PROVIDER_MAP.get(conn.provider)
                    if (!provider) return null
                    const Icon = provider.icon
                    return (
                      <ConnectionTile
                        key={provider.id}
                        name={provider.name}
                        icon={<Icon className="w-5 h-5 text-text-primary" />}
                        connected
                      />
                    )
                  })}
                  <ConnectionTile
                    name="Connect Service"
                    icon={<Plus size={20} style={{ color: "var(--color-text-tertiary)" }} />}
                    connected={false}
                    onClick={() => router.push("/shop")}
                    dashed
                  />
                </div>
              </section>

            </div>

            {/* Right Sidebar Area: Workflows List Card */}
            <div className="flex flex-col">
              <div
                className="rounded-xl shadow-sm flex flex-col overflow-hidden"
                style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-border)" }}
              >
                <div className="px-6 pt-6 pb-4 flex items-center justify-between">
                  <h2 className="text-base font-medium" style={{ color: "var(--color-text-primary)" }}>Recent workflows</h2>
                </div>

                <div className="flex flex-col">
                  {recentWorkflows.length > 0 ? (
                    recentWorkflows.map((wf, idx) => (
                      <Link
                        key={wf.id}
                        href={`/automations/${wf.id}`}
                        className={cn(
                          "relative flex items-center gap-3 px-6 py-4 transition-colors group hover:bg-bg-subtle",
                          idx !== recentWorkflows.length - 1 && "border-b"
                        )}
                        style={{ borderColor: "var(--color-border)" }}
                      >
                        <div
                          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
                          style={{ background: wf.isDeployed ? "var(--color-accent)" : "var(--color-border-strong)" }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                            {wf.name}
                          </p>
                          <p className="text-xs font-[360] flex items-center gap-1.5 mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                            {wf.isDeployed && (
                              <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-success)" }} />
                                Live
                              </span>
                            )}
                            <Clock size={12} />
                            {new Date(wf.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        <ArrowRight size={16} className="shrink-0 transition-colors" style={{ color: "var(--color-text-tertiary)" }} />
                      </Link>
                    ))
                  ) : (
                    <div className="px-6 py-8 text-center">
                      <p className="text-xs font-[360]" style={{ color: "var(--color-text-secondary)" }}>No workflows created yet.</p>
                    </div>
                  )}
                </div>

                {recentWorkflows.length > 0 && (
                  <Link
                    href="/automations"
                    className="px-6 py-4 text-xs font-medium transition-colors text-center hover:bg-bg-subtle"
                    style={{ background: "var(--color-bg-subtle)", color: "var(--color-accent)", borderTop: "1px solid var(--color-border)" }}
                  >
                    View all workflows
                  </Link>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </PageTransition>
  )
}
