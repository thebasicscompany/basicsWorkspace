import { VideoCamera } from "@phosphor-icons/react"
import type { AppManifest } from "@/apps/_types"

export const recorderApp = {
  slug: "recorder",
  name: "Recorder",
  href: "/recorder",
  icon: VideoCamera,
  iconColor: "text-white",
  iconBg: "bg-rose-500",
  iconWeight: "fill",
  order: 2,
} satisfies AppManifest
