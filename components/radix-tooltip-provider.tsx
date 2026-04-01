"use client"

import { TooltipProvider } from "@/components/ui/tooltip"

export function RadixTooltipProvider({ children }: { children: React.ReactNode }) {
  return <TooltipProvider delay={300}>{children}</TooltipProvider>
}
