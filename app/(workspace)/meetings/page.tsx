import { VideoCamera } from "@phosphor-icons/react/dist/ssr"
import { PageTransition } from "@/components/page-transition"
import { AppHeader } from "@/components/app-header"
import { EmptyState } from "@/components/ui/empty-state"

export default function MeetingsPage() {
  return (
    <>
      <AppHeader
        breadcrumb={[
          { label: "Workspace", href: "/" },
          { label: "Meetings" },
        ]}
      />
      <PageTransition>
        <div className="flex-1 p-8" style={{ background: "var(--color-bg-base)" }}>
          <EmptyState
            icon={<VideoCamera size={40} className="text-zinc-300" />}
            title="Meetings coming soon"
            description="Record, transcribe, and summarize your team meetings."
          />
        </div>
      </PageTransition>
    </>
  )
}
