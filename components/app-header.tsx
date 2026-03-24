import Link from "next/link"
import { cn } from "@/lib/utils"

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface AppHeaderProps {
  breadcrumb: BreadcrumbItem[]
  actions?: React.ReactNode
  className?: string
}

export function AppHeader({ breadcrumb, actions, className }: AppHeaderProps) {
  return (
    <header
      className={cn(
        "h-12 flex items-center justify-between px-6 bg-white border-b shrink-0",
        className
      )}
      style={{ borderColor: "var(--color-border)" }}
    >
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        {breadcrumb.map((item, i) => {
          const isLast = i === breadcrumb.length - 1
          return (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && (
                <span style={{ color: "var(--color-text-tertiary)" }}>/</span>
              )}
              {isLast ? (
                <span className="font-medium text-zinc-700">{item.label}</span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className="text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span style={{ color: "var(--color-text-tertiary)" }}>
                  {item.label}
                </span>
              )}
            </span>
          )
        })}
      </nav>

      {/* Right side actions */}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  )
}
