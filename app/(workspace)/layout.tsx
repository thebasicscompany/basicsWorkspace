import { WorkspaceSidebar } from "@/components/workspace-sidebar"
import { RadixTooltipProvider } from "@/components/radix-tooltip-provider"
import { WorkspaceMain } from "@/components/workspace-main"

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RadixTooltipProvider>
      <WorkspaceSidebar />
      <WorkspaceMain>{children}</WorkspaceMain>
    </RadixTooltipProvider>
  )
}
