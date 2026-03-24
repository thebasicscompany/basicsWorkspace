import { Note } from "@phosphor-icons/react"
import type { AppManifest } from "@/apps/_types"

export const notesApp = {
  slug: "notes",
  name: "Notes",
  href: "/notes",
  icon: Note,
  iconColor: "text-white",
  iconBg: "bg-yellow-500",
  iconWeight: "fill",
  order: 4,
} satisfies AppManifest
