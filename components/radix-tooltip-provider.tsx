"use client"

import * as Tooltip from "@radix-ui/react-tooltip"

export function RadixTooltipProvider({ children }: { children: React.ReactNode }) {
  return <Tooltip.Provider delayDuration={300}>{children}</Tooltip.Provider>
}
