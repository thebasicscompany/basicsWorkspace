import {
  UserCircle,
  Users,
  Buildings,
  CurrencyDollar,
  CheckSquare,
  Note,
  VideoCamera,
  FolderOpen,
  Package,
  Briefcase,
  Tag,
  Database,
  Globe,
  ChartBar,
  GearSix,
  Cube,
  Lightning,
  Star,
  Handshake,
  ShoppingCart,
  Rocket,
  Calendar,
} from "@phosphor-icons/react"
import type { Icon as PhosphorIcon } from "@phosphor-icons/react"

export const OBJECT_ICON_MAP: Record<string, PhosphorIcon> = {
  UserCircle,
  Users,
  Buildings,
  CurrencyDollar,
  CheckSquare,
  Note,
  VideoCamera,
  FolderOpen,
  Package,
  Briefcase,
  Tag,
  Database,
  Globe,
  ChartBar,
  GearSix,
  Cube,
  Lightning,
  Star,
  Handshake,
  ShoppingCart,
  Rocket,
  Calendar,
}

export const PICKER_ICONS = Object.keys(OBJECT_ICON_MAP)

export const COLOR_OPTIONS = [
  { label: "Blue",   value: "text-blue-500",   hex: "#3B82F6" },
  { label: "Violet", value: "text-violet-500",  hex: "#8B5CF6" },
  { label: "Green",  value: "text-green-500",   hex: "#10B981" },
  { label: "Amber",  value: "text-amber-500",   hex: "#F59E0B" },
  { label: "Red",    value: "text-red-500",     hex: "#EF4444" },
  { label: "Pink",   value: "text-pink-500",    hex: "#EC4899" },
  { label: "Cyan",   value: "text-cyan-500",    hex: "#06B6D4" },
  { label: "Orange", value: "text-orange-500",  hex: "#F97316" },
  { label: "Teal",   value: "text-teal-500",    hex: "#14B8A6" },
  { label: "Slate",  value: "text-slate-500",   hex: "#64748B" },
]

/** Map stored color class to a hex value for rendering. Falls back to gray. */
export function colorToHex(colorClass: string): string {
  return COLOR_OPTIONS.find((c) => c.value === colorClass)?.hex ?? "#64748B"
}
