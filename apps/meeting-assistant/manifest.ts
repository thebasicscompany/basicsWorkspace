import { Microphone } from "@phosphor-icons/react"
import type { AppManifest } from "@/apps/_types"

export const meetingAssistantApp = {
  slug: "meeting-assistant",
  name: "Meeting Asst.",
  href: "/meeting-assistant",
  icon: Microphone,
  iconColor: "text-white",
  iconBg: "bg-violet-500",
  iconWeight: "fill",
  order: 6,
} satisfies AppManifest
