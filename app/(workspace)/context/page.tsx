"use client"

import { AppHeader } from "@/components/app-header"
import { PageTransition } from "@/components/page-transition"
import { ContextAsk } from "@/apps/context/components/ContextAsk"
import { TimelineFeed } from "@/apps/context/components/TimelineFeed"

export default function ContextPage() {
  return (
    <>
      <AppHeader breadcrumb={[{ label: "Workspace", href: "/" }, { label: "Context" }]} />
      <PageTransition>
        <div
          className="flex flex-col"
          style={{ height: "calc(100vh - 48px)", background: "var(--color-bg-surface)" }}
        >
          {/* Ask bar — shrinks/grows with content, never pushes timeline off screen */}
          <div className="shrink-0 border-b" style={{ borderColor: "var(--color-border)" }}>
            <ContextAsk />
          </div>

          {/* Timeline — fills remaining height */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <TimelineFeed />
          </div>
        </div>
      </PageTransition>
    </>
  )
}
