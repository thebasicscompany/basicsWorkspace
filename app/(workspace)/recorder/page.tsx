import { PageTransition } from "@/components/page-transition"
import { AppHeader } from "@/components/app-header"
import { RecordingList } from "@/apps/recorder/components/recording-list"

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
          <RecordingList />
        </div>
      </PageTransition>
    </>
  )
}
