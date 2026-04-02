"use client"

interface HeaderButtonProps {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick?: () => void
}

export function HeaderButton({ icon, label, active, onClick }: HeaderButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 h-7 rounded text-xs font-medium transition-colors hover:bg-bg-subtle"
      style={{ color: active ? "var(--color-accent)" : "var(--color-text-secondary)" }}
    >
      {icon}
      {label}
    </button>
  )
}
