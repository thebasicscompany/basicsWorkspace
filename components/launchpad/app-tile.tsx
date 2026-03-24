"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface AppTileProps {
  name: string
  subtitle?: string
  icon: React.ReactNode
  href?: string
  onClick?: () => void
  className?: string
  groupIcons?: React.ReactNode[]
  iconBg?: string
  dashed?: boolean
}

export function AppTile({
  name,
  subtitle,
  icon,
  href,
  onClick,
  className,
  groupIcons,
  iconBg,
  dashed,
}: AppTileProps) {
  const box = (
    <motion.div
      whileHover={{ scale: dashed ? 1.02 : 1.05, boxShadow: dashed ? "none" : "var(--shadow-md)" }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      className={cn(
        "w-[80px] h-[80px] rounded-[20px] cursor-pointer group",
        "flex items-center justify-center shrink-0 transition-all",
        dashed 
          ? "border-[2.5px] border-dashed border-zinc-400/70 bg-transparent hover:border-zinc-500 hover:bg-black/[0.03]"
          : (iconBg || "bg-white border"),
        className
      )}
      style={dashed ? undefined : {
        borderColor: !iconBg ? "var(--color-border)" : undefined,
        boxShadow: iconBg ? "var(--shadow-squircle-color)" : "var(--shadow-squircle-white)",
      }}
    >
      {groupIcons && groupIcons.length > 0 ? (
        <div className="grid grid-cols-2 gap-1 w-[44px] h-[44px]">
          {groupIcons.slice(0, 4).map((gi, i) => (
            <div key={i} className={cn("flex items-center justify-center rounded-md", iconBg ? "bg-black/10" : "bg-zinc-50")}>
              {gi}
            </div>
          ))}
        </div>
      ) : (
        icon
      )}
    </motion.div>
  )

  return (
    <div className="flex flex-col items-center gap-2 w-[80px]">
      {href ? (
        <Link href={href} className="block">{box}</Link>
      ) : (
        <button onClick={onClick}>{box}</button>
      )}
      <p
        className="text-center leading-tight font-medium w-full truncate"
        style={{ fontSize: "13px", color: "var(--color-text-primary)" }}
      >
        {name}
      </p>
      {subtitle && (
        <p
          className="text-center leading-tight -mt-1 truncate w-full"
        style={{ fontSize: "11px", color: "var(--color-text-tertiary)" }}
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}
