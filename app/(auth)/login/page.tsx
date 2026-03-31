"use client"

import Image from "next/image"
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <Image
              src="/logo.png"
              alt="Basics"
              width={24}
              height={24}
              className="rounded-[6px]"
              style={{ boxShadow: "var(--shadow-squircle-white)" }}
            />
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="relative hidden lg:block overflow-hidden" style={{ background: "#2D8653" }}>
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
          mixBlendMode: "overlay" as const,
        }} />
        <div className="absolute bottom-12 left-12 right-12">
          <p className="font-display text-white/60 text-sm tracking-wide" style={{ fontWeight: 400 }}>Welcome to</p>
          <p className="font-display text-white italic" style={{ fontSize: "48px", lineHeight: 1.1, fontWeight: 400 }}>basics.</p>
        </div>
      </div>
    </div>
  )
}
