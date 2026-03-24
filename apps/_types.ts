import type { FC } from "react"
import type { IconProps } from "@phosphor-icons/react"

/** Any Phosphor icon component */
export type PhosphorIconComponent = FC<IconProps>

export interface SubAppManifest {
  slug: string
  name: string
  href: string
  icon: PhosphorIconComponent
  iconColor: string
  iconBg?: string
}

export interface AppManifest {
  /** Unique identifier — matches the route slug and apps/ folder name */
  slug: string
  /** Display name shown on the tile */
  name: string
  /** Primary route, e.g. "/crm" */
  href: string
  /** Phosphor icon component (not rendered — just the class reference) */
  icon: PhosphorIconComponent
  /** Tailwind text color class applied to the icon */
  iconColor: string
  /** Tailwind background class applied to the tile */
  iconBg?: string
  /** Phosphor weight. Defaults to "fill" */
  iconWeight?: "fill" | "regular" | "bold" | "light"
  /** Small subtitle shown under the tile name, e.g. "3 active" */
  subtitle?: string
  /**
   * Group apps (e.g. CRM) expand into sub-apps.
   * When true, the tile renders a 2×2 icon preview from subApps.
   */
  isGroup?: boolean
  subApps?: SubAppManifest[]
  /** Controls display order on the launchpad */
  order?: number
}
