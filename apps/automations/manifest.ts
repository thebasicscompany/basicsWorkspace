import { Lightning } from "@phosphor-icons/react"
import type { AppManifest } from "@/apps/_types"

export const automationsApp = {
  slug: "automations",
  name: "Automations",
  href: "/automations",
  icon: Lightning,
  iconColor: "text-white",
  iconBg: "bg-[#2D8653]",
  iconWeight: "fill",
  subtitle: "3 active",
  order: 1,
} satisfies AppManifest
