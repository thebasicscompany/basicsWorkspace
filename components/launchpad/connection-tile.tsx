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
        whileHover={{ scale: dashed ? 1.02 : 1.05, boxShadow: dashed ? "none" : "var(--shadow-lg)" }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.12, ease: "easeOut" }}
        className={cn(
          "relative w-[80px] h-[80px] rounded-[20px] cursor-pointer flex items-center justify-center group shrink-0 transition-all",
          dashed 
            ? "border-[2.5px] border-dashed border-zinc-400/70 bg-transparent hover:border-zinc-500 hover:bg-black/[0.03]"
            : (iconBg || "bg-white border")
        )}
        style={dashed ? undefined : {
          borderColor: !iconBg ? "var(--color-border)" : undefined,
          boxShadow: iconBg ? "var(--shadow-squircle-color)" : "var(--shadow-squircle-white)",
        }}
      >
        {icon}

        {connected && (
          <span className="absolute top-2 right-2 w-3 h-3 rounded-full ring-[2px] ring-white" style={{ background: "#2D8653" }} />
        )}

        {!connected && (
          <span className="absolute inset-0 rounded-2xl flex items-center justify-center bg-white/75 opacity-0 group-hover:opacity-100 transition-opacity">
            <Plus size={24} className="text-zinc-500" />
          </span>
        )}
      </motion.button>
      <p
        className="text-center leading-tight font-medium w-full truncate"
        style={{ fontSize: "13px", color: "var(--color-text-primary)" }}
      >
        {name}
      </p>
    </div>
  )
}
