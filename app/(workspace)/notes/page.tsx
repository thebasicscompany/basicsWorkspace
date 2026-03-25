"use client"

import { AppHeader } from "@/components/app-header"
import { PageTransition } from "@/components/page-transition"
import { NotesApp } from "@/apps/notes/components/NotesApp"

export default function NotesPage() {
  return (
    <>
      <AppHeader breadcrumb={[{ label: "Workspace", href: "/" }, { label: "Notes" }]} />
      <PageTransition>
        <div style={{ height: "calc(100vh - 48px)", overflow: "hidden" }}>
          <NotesApp />
        </div>
      </PageTransition>
    </>
  )
}
