import { Note } from "@phosphor-icons/react/dist/ssr"
import { PageTransition } from "@/components/page-transition"
import { AppHeader } from "@/components/app-header"
import { EmptyState } from "@/components/ui/empty-state"

export default function NotesPage() {
  return (
    <>
      <AppHeader
        breadcrumb={[
          { label: "Workspace", href: "/" },
          { label: "Notes" },
        ]}
      />
      <PageTransition>
        <div className="flex-1 p-8" style={{ background: "var(--color-bg-base)" }}>
          <EmptyState
            icon={<Note size={40} className="text-zinc-300" />}
            title="Notes coming soon"
            description="Capture and organize your team's knowledge."
          />
        </div>
      </PageTransition>
    </>
  )
}
