"use client"

import { useSidebar } from "@/components/workspace-sidebar"

export function WorkspaceMain({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar()

  return (
    <main
      className="min-h-screen flex flex-col transition-all duration-200"
      style={{ marginLeft: collapsed ? 68 : 232 }}
    >
      {children}
    </main>
  )
}
