import { CheckSquare } from "@phosphor-icons/react"
import type { AppManifest } from "@/apps/_types"

export const tasksApp = {
  slug: "tasks",
  name: "Tasks",
  href: "/tasks",
  icon: CheckSquare,
  iconColor: "text-white",
  iconBg: "bg-amber-500",
  iconWeight: "fill",
  order: 3,
} satisfies AppManifest
