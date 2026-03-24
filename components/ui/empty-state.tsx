import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[12rem] flex-col items-center justify-center gap-3 p-8 text-center",
        className
      )}
    >
      {icon && (
        <div style={{ color: "var(--color-text-tertiary)" }} className="[&>svg]:size-10">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <h3 className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
          {title}
        </h3>
        {description && (
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
