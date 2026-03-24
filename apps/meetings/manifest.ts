import { VideoCamera } from "@phosphor-icons/react"
import type { AppManifest } from "@/apps/_types"

export const meetingsApp = {
  slug: "meetings",
  name: "Meetings",
  href: "/meetings",
  icon: VideoCamera,
  iconColor: "text-white",
  iconBg: "bg-blue-500",
  iconWeight: "fill",
  order: 5,
} satisfies AppManifest
