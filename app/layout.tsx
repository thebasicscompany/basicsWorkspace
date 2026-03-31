import type { Metadata } from "next"
import { Cabin, Fraunces } from "next/font/google"
import "./globals.css"

const cabin = Cabin({
  subsets: ["latin"],
  variable: "--font-cabin",
  display: "swap",
})

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
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
    <html lang="en" className={`${cabin.variable} ${fraunces.variable}`}>
      <body className="paper-grain">{children}</body>
    </html>
  )
}
