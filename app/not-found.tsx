"use client"

import Link from "next/link"
import { House } from "@phosphor-icons/react"

export default function NotFound() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: "var(--color-bg-base)" }}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <p
          className="text-6xl font-display"
          style={{ color: "var(--color-text-tertiary)", fontWeight: 700, letterSpacing: "-0.04em" }}
        >
          404
        </p>
        <p style={{ fontSize: 15, color: "var(--color-text-secondary)" }}>
          This page doesn't exist.
        </p>
        <Link
          href="/"
          className="mt-2 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-white transition-opacity hover:opacity-90"
          style={{ fontSize: 13, fontWeight: 500, background: "var(--color-accent)" }}
        >
          <House size={14} weight="fill" />
          Back to Home
        </Link>
      </div>
    </div>
  )
}
