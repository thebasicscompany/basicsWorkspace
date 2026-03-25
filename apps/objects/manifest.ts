import { Cube } from "@phosphor-icons/react"
import type { AppManifest } from "@/apps/_types"

export const objectsApp = {
  slug: "objects",
  name: "Objects",
  href: "/objects",
  icon: Cube,
  iconColor: "text-white",
  iconBg: "bg-slate-600",
  iconWeight: "fill",
  order: 7,
} satisfies AppManifest
