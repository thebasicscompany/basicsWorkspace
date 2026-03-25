import { Graph } from "@phosphor-icons/react"
import type { AppManifest } from "@/apps/_types"

export const contextApp = {
  slug: "context",
  name: "Context",
  href: "/context",
  icon: Graph,
  iconColor: "text-white",
  iconBg: "bg-violet-600",
  iconWeight: "fill",
  order: 10,
} satisfies AppManifest
