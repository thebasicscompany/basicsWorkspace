"use client"

import { motion } from "framer-motion"
import { Plus } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

interface ConnectionTileProps {
  name: string
  icon: React.ReactNode
  connected?: boolean
  onClick?: () => void
  iconBg?: string
  dashed?: boolean
}

export function ConnectionTile({ name, icon, connected = false, onClick, iconBg, dashed }: ConnectionTileProps) {
  return (
    <div className="flex flex-col items-center gap-2 w-[80px]">
      <motion.button
        onClick={onClick}
        whileTap={{ scale: 0.96 }}
        transition={{ duration: 0.12, ease: "easeOut" }}
        className={cn(
          "relative w-[80px] h-[80px] rounded-[20px] cursor-pointer flex items-center justify-center group shrink-0 tile-hover",
          dashed
            ? "border-[2px] border-dashed border-zinc-300/70 dark:border-zinc-600/70 bg-transparent hover:border-zinc-400 dark:hover:border-zinc-500 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
            : (iconBg || "border")
        )}
        style={dashed ? undefined : {
          background: !iconBg ? "var(--color-bg-surface)" : undefined,
          borderColor: !iconBg ? "var(--color-border)" : undefined,
          boxShadow: iconBg ? "var(--shadow-squircle-color)" : "var(--shadow-squircle-white)",
        }}
      >
        {icon}

        {connected && (
          <span
            className="absolute top-2 right-2 w-3 h-3 rounded-full"
            style={{
              background: "var(--color-accent)",
              boxShadow: "0 0 0 2px var(--color-bg-surface)",
            }}
          />
        )}

        {!connected && (
          <span className="absolute inset-0 rounded-2xl flex items-center justify-center bg-white/75 dark:bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
            <Plus size={24} className="text-zinc-500 dark:text-zinc-300" />
          </span>
        )}
      </motion.button>
      <p
        className="text-center leading-tight w-full truncate"
        style={{ fontSize: "12px", color: "var(--color-text-primary)", fontWeight: 500 }}
      >
        {name}
      </p>
    </div>
  )
}
