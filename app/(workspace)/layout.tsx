import { WorkspaceSidebar } from "@/components/workspace-sidebar"

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <WorkspaceSidebar />
      <main className="ml-16 min-h-screen flex flex-col">{children}</main>
    </>
  )
}
