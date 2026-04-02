"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface AppTileProps {
  name: string
  subtitle?: string
  icon: React.ReactNode
  href?: string
  onClick?: () => void
  className?: string
  groupIcons?: React.ReactNode[]
  dashed?: boolean
  iconBg?: string
}

export function AppTile({
  name,
  icon,
  href,
  onClick,
  className,
  groupIcons,
  dashed,
  iconBg,
}: AppTileProps) {
  const box = (
    <motion.div
      whileTap={{ scale: 0.94 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.1, ease: "easeOut" }}
      className={cn(
        "flex flex-col items-center justify-center cursor-pointer w-16 h-16 shrink-0 relative",
        "rounded-xl shadow-sm border transition-all",
        dashed ? "border-dashed bg-transparent hover:bg-bg-subtle border-border-strong" : (iconBg ? iconBg : "bg-bg-surface border-border"),
        className
      )}
    >
      {groupIcons && groupIcons.length > 0 ? (
        <div className="grid grid-cols-2 gap-1 w-[32px] h-[32px]">
          {groupIcons.slice(0, 4).map((gi, i) => (
            <div key={i} className="flex items-center justify-center rounded-[4px] bg-black/10">
              {gi}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: iconBg ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>
          {icon}
        </div>
      )}
    </motion.div>
  )

  return (
    <Tooltip>
      <TooltipTrigger
        render={href ? <Link href={href} className="block outline-none" /> : <button onClick={onClick} className="outline-none focus:outline-none" />}
      >
        {box}
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8}>
        {name}
      </TooltipContent>
    </Tooltip>
  )
}
