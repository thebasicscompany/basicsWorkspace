import { cn } from "@/lib/utils"

interface SectionLabelProps {
  children: React.ReactNode
  className?: string
}

export function SectionLabel({ children, className }: SectionLabelProps) {
  return (
    <p
      className={cn("font-medium tracking-wider uppercase", className)}
      style={{ fontSize: "10px", color: "var(--color-text-tertiary)" }}
    >
      {children}
    </p>
  )
}
