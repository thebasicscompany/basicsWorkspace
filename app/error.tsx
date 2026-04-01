"use client"

import { useEffect } from "react"
import { ArrowCounterClockwise } from "@phosphor-icons/react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Unhandled error:", error)
  }, [error])

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: "var(--color-bg-base)" }}
    >
      <div className="flex flex-col items-center gap-4 text-center max-w-md px-4">
        <div
          className="flex items-center justify-center rounded-2xl"
          style={{ width: 56, height: 56, background: "#FEF2F2" }}
        >
          <span style={{ fontSize: 24 }}>!</span>
        </div>
        <p
          style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text-primary)" }}
        >
          Something went wrong
        </p>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
          An unexpected error occurred. Try refreshing, or go back and try again.
        </p>
        {error.digest && (
          <code
            className="rounded-lg px-3 py-1.5"
            style={{
              fontSize: 11,
              color: "var(--color-text-tertiary)",
              background: "var(--color-bg-subtle)",
              border: "1px solid var(--color-border)",
            }}
          >
            Error ID: {error.digest}
          </code>
        )}
        <button
          onClick={reset}
          className="mt-2 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-white transition-opacity hover:opacity-90"
          style={{ fontSize: 13, fontWeight: 500, background: "var(--color-accent)" }}
        >
          <ArrowCounterClockwise size={14} />
          Try Again
        </button>
      </div>
    </div>
  )
}
