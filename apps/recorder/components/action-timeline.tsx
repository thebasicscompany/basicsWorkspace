"use client"

import { CursorClick, Keyboard, ArrowsLeftRight, ArrowsDownUp, CheckCircle, Warning, Question } from "@phosphor-icons/react"

interface UnderstoodAction {
  step: number
  action: string
  element: string
  app: string
  value: string
  confidence: "high" | "medium" | "low"
}

const CONFIDENCE_STYLES = {
  high:   { icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50" },
  medium: { icon: Warning,     color: "text-amber-500",   bg: "bg-amber-50" },
  low:    { icon: Question,    color: "text-red-400",     bg: "bg-red-50" },
}

const EVENT_ICONS: Record<string, typeof CursorClick> = {
  click: CursorClick,
  keyInput: Keyboard,
  windowSwitch: ArrowsLeftRight,
  scroll: ArrowsDownUp,
}

export function ActionTimeline({ actions }: { actions: UnderstoodAction[] }) {
  if (actions.length === 0) {
    return (
      <div className="px-6 py-8 text-center">
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          No actions understood yet.
        </p>
      </div>
    )
  }

  return (
    <div className="px-6 py-4">
      <div className="relative">
        {/* Vertical line */}
        <div
          className="absolute left-[15px] top-2 bottom-2 w-px"
          style={{ background: "var(--color-border)" }}
        />

        <div className="flex flex-col gap-1">
          {actions.map((action, i) => {
            const conf = CONFIDENCE_STYLES[action.confidence]
            const ConfIcon = conf.icon

            return (
              <div key={i} className="flex items-start gap-3 relative pl-9 py-2">
                {/* Dot on timeline */}
                <div
                  className="absolute left-[11px] top-[14px] w-[9px] h-[9px] rounded-full border-2 bg-white"
                  style={{ borderColor: "var(--color-accent)" }}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-medium"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {action.action}
                    </span>
                    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${conf.bg} ${conf.color}`}>
                      <ConfIcon size={10} weight="fill" />
                      {action.confidence}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-0.5">
                    {action.app && (
                      <span
                        className="text-xs"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {action.app}
                      </span>
                    )}
                    {action.app && action.element && (
                      <span style={{ color: "var(--color-text-tertiary)" }}>·</span>
                    )}
                    {action.element && (
                      <span
                        className="text-xs"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        {action.element}
                      </span>
                    )}
                  </div>

                  {action.value && (
                    <div
                      className="mt-1 rounded-md px-2 py-1 text-xs font-mono"
                      style={{
                        background: "var(--color-bg-subtle)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {action.value}
                    </div>
                  )}
                </div>

                <span
                  className="text-xs tabular-nums shrink-0 mt-0.5"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  #{action.step}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
