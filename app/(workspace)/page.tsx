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
      {/* 24px top padding, 32px horizontal padding per Mercury spec */}
      <div className="relative flex flex-col pt-[24px] px-[32px] pb-[112px] min-h-screen">
        
        <div className="relative z-10 flex flex-col h-full max-w-[968px] w-full mx-auto editorial-stagger">
          
          <div className="flex items-baseline justify-between mb-8">
            <h1 className="text-[28px] font-medium text-zinc-900 tracking-tight">
              {greeting}, Arav
            </h1>
          </div>

          {/* Action Row - Mercury Style Pill Buttons */}
          <div className="flex items-center gap-3 mb-10">
            <button
              onClick={() => router.push("/shop")}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] text-white rounded-full text-[14px] font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              <Plus size={16} weight="bold" />
              Get new apps
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-full text-[14px] font-medium hover:bg-zinc-50 transition-colors whitespace-nowrap"
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
                <h2 className="text-[18px] font-medium text-zinc-900 tracking-tight mb-2">Installed Apps</h2>
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
                    icon={<Plus size={20} className="text-zinc-400 group-hover:text-zinc-600 transition-colors" />}
                    dashed
                  />
                </div>
              </section>

              {/* Connections Sector */}
              <section className="flex flex-col gap-4">
                <h2 className="text-[18px] font-medium text-zinc-900 tracking-tight mb-2">Connections</h2>
                <div className="flex flex-wrap gap-5">
                  {connections.map((conn) => {
                    const provider = PROVIDER_MAP.get(conn.provider)
                    if (!provider) return null
                    const Icon = provider.icon
                    return (
                      <ConnectionTile
                        key={provider.id}
                        name={provider.name}
                        icon={<Icon className="w-5 h-5 text-zinc-700" />}
                        connected
                      />
                    )
                  })}
                  <ConnectionTile
                    name="Connect Service"
                    icon={<Plus size={20} className="text-zinc-400 group-hover:text-zinc-600 transition-colors" />}
                    connected={false}
                    onClick={() => router.push("/shop")}
                    dashed
                  />
                </div>
              </section>

            </div>

            {/* Right Sidebar Area: Workflows List Card */}
            <div className="flex flex-col">
              <div className="bg-white border border-zinc-200 rounded-[16px] shadow-sm flex flex-col overflow-hidden">
                <div className="px-[24px] pt-[24px] pb-[16px] flex items-center justify-between">
                  <h2 className="text-[16px] font-medium text-zinc-900">Recent workflows</h2>
                </div>
                
                <div className="flex flex-col">
                  {recentWorkflows.length > 0 ? (
                    recentWorkflows.map((wf, idx) => (
                      <Link
                        key={wf.id}
                        href={`/automations/${wf.id}`}
                        className={cn(
                          "relative flex items-center gap-3 px-[24px] py-[16px] hover:bg-zinc-50 transition-colors group",
                          idx !== recentWorkflows.length - 1 && "border-b border-zinc-100"
                        )}
                      >
                        <div className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full ${wf.isDeployed ? 'bg-accent' : 'bg-border-strong'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-medium text-zinc-900 truncate">
                            {wf.name}
                          </p>
                          <p className="text-[13px] text-zinc-500 font-[360] flex items-center gap-1.5 mt-0.5">
                            {wf.isDeployed && (
                              <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
                                Live
                              </span>
                            )}
                            <Clock size={12} />
                            {new Date(wf.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        <ArrowRight size={16} className="text-zinc-300 group-hover:text-zinc-500 transition-colors shrink-0" />
                      </Link>
                    ))
                  ) : (
                    <div className="px-[24px] py-[32px] text-center">
                      <p className="text-[13px] text-zinc-500 font-[360]">No workflows created yet.</p>
                    </div>
                  )}
                </div>

                {recentWorkflows.length > 0 && (
                  <Link 
                    href="/automations" 
                    className="px-[24px] py-[16px] bg-zinc-50 text-[13px] font-medium text-[var(--color-accent-foreground)] hover:bg-zinc-100 transition-colors border-t border-zinc-100 text-center"
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
