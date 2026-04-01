import { Lightning } from "@phosphor-icons/react"
import type { AppManifest } from "@/apps/_types"

export const automationsApp = {
  slug: "automations",
  name: "Automations",
  href: "/automations",
  icon: Lightning,
  iconColor: "text-white",
  iconBg: "bg-emerald-700",
  iconWeight: "fill",
  order: 1,
} satisfies AppManifest
