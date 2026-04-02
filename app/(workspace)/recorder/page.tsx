"use client"

import { PageTransition } from "@/components/page-transition"
import { AppHeader } from "@/components/app-header"
import { EmptyState } from "@/components/ui/empty-state"
import { RecordingList } from "@/apps/recorder/components/recording-list"
import { isElectron } from "@/lib/electron"
import { Monitor } from "@phosphor-icons/react"

export default function RecorderPage() {
  return (
    <>
      <AppHeader
        breadcrumb={[
          { label: "Workspace", href: "/" },
          { label: "Recorder" },
        ]}
      />
      <PageTransition>
        <div style={{ background: "var(--color-bg-base)" }}>
          {isElectron ? (
            <RecordingList />
          ) : (
            <EmptyState
              icon={<Monitor weight="light" />}
              title="Available on desktop app"
              description="The Recorder requires the Basics desktop app. Download it to capture actions and convert them into automations."
            />
          )}
        </div>
      </PageTransition>
    </>
  )
}
