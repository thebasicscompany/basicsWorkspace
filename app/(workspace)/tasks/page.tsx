"use client"

import { AppHeader } from "@/components/app-header"
import { PageTransition } from "@/components/page-transition"
import { TasksKanban } from "@/apps/tasks/components/TasksKanban"

export default function TasksPage() {
  return (
    <>
      <AppHeader breadcrumb={[{ label: "Workspace", href: "/" }, { label: "Tasks" }]} />
      <PageTransition>
        <div style={{ height: "calc(100vh - 48px)", overflow: "hidden" }}>
          <TasksKanban />
        </div>
      </PageTransition>
    </>
  )
}
