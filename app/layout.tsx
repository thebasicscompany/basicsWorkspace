import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { WorkspaceSidebar } from "@/components/workspace-sidebar"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Basics Workspace",
  description: "Company OS. Automations-first.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body style={{ fontFamily: "var(--font-inter, 'Inter', sans-serif)" }}>
        <WorkspaceSidebar />
        <main className="ml-16 min-h-screen flex flex-col">
          {children}
        </main>
      </body>
    </html>
  )
}
