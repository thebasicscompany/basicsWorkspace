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
        "flex items-center justify-between px-6 bg-white border-b shrink-0",
        className
      )}
      style={{
        borderColor: "var(--color-border)",
        borderBottomWidth: "0.5px",
        height: 72,
        paddingTop: 16,
        paddingBottom: 16,
      }}
    >
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2.5 text-xl font-display">
        {breadcrumb.map((item, i) => {
          const isLast = i === breadcrumb.length - 1
          return (
            <span key={i} className="flex items-center gap-2.5">
              {i > 0 && (
                <span className="font-light opacity-30" style={{ color: "var(--color-text-primary)" }}>/</span>
              )}
              {isLast ? (
                <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{item.label}</span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className="hover:text-zinc-600 transition-colors"
                  style={{ color: "var(--color-text-tertiary)", fontWeight: 400 }}
                >
                  {item.label}
                </Link>
              ) : (
                <span style={{ color: "var(--color-text-tertiary)", fontWeight: 400 }}>
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
