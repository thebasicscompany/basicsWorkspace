"use client"

import { motion } from "framer-motion"
import { Plus } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

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
    <Tooltip>
      <TooltipTrigger
        render={
          <motion.button
            onClick={onClick}
            whileTap={{ scale: 0.94 }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.1, ease: "easeOut" }}
            className={cn(
              "flex flex-col items-center justify-center cursor-pointer w-16 h-16 shrink-0 relative outline-none focus:outline-none",
              "rounded-[16px] shadow-sm border border-zinc-200/60 transition-all",
              dashed ? "border-dashed bg-transparent hover:bg-zinc-50 border-zinc-300" : (iconBg ? iconBg : "bg-white")
            )}
          />
        }
      >
        <div className="text-zinc-700 relative">
          {icon}
          
          {connected && (
            <span
              className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full"
              style={{
                background: "var(--color-success)",
                boxShadow: "0 0 0 2px white",
              }}
            />
          )}

          {!connected && !dashed && (
            <span className="absolute inset-0 rounded-full flex items-center justify-center bg-white/75 opacity-0 hover:opacity-100 transition-opacity">
              <Plus size={16} className="text-zinc-600" />
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8}>
        {name}
      </TooltipContent>
    </Tooltip>
  )
}
