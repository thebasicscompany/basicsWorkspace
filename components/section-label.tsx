import { cn } from "@/lib/utils"

interface SectionLabelProps {
  children: React.ReactNode
  className?: string
}

export function SectionLabel({ children, className }: SectionLabelProps) {
  return (
    <p
      className={cn("uppercase", className)}
      style={{ fontSize: 10, color: "var(--color-text-tertiary)", fontWeight: 500, letterSpacing: "0.15em" }}
    >
      {children}
    </p>
  )
}
