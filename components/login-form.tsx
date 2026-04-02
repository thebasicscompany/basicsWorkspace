"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FieldGroup, FieldSeparator, FieldDescription } from "@/components/ui/field"
import { signIn } from "@/lib/auth-client"

function FloatingInput({
  id,
  label,
  type = "text",
  required,
}: {
  id: string
  label: string
  type?: string
  required?: boolean
}) {
  return (
    <fieldset
      className="rounded-xl border px-3 pb-2 pt-0 transition-colors focus-within:border-accent"
      style={{ borderColor: "var(--color-border-strong)" }}
    >
      <legend
        className="ml-1 px-1 text-xs font-medium"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {label}{required && <span style={{ color: "var(--color-error)" }}>*</span>}
      </legend>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        className="w-full bg-transparent outline-none text-sm"
        style={{ color: "var(--color-text-primary)", height: 28 }}
      />
    </fieldset>
  )
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const data = new FormData(e.currentTarget)
    const email = data.get("email") as string
    const password = data.get("password") as string
    const result = await signIn.email({ email, password })
    if (result.error) {
      setError(result.error.message ?? "Invalid email or password")
      setLoading(false)
      return
    }
    router.push("/")
  }

  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={handleSubmit} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1.5 text-center">
          <h1 className="font-display text-2xl font-normal" style={{ color: "var(--color-text-primary)" }}>Sign in</h1>
          <p className="text-sm text-balance" style={{ color: "var(--color-text-secondary)" }}>
            Enter your email below to continue
          </p>
        </div>
        <FloatingInput id="email" label="Email" type="email" required />
        <FloatingInput id="password" label="Password" type="password" required />
        {error && (
          <p className="text-sm text-center -mt-2" style={{ color: "var(--color-error)" }}>
            {error}
          </p>
        )}
        <div>
          <Button type="submit" disabled={loading} size="lg" className="w-full bg-accent text-white hover:opacity-90">
            {loading ? "Signing in..." : "Login"}
          </Button>
        </div>
        <FieldSeparator>Or continue with</FieldSeparator>
        <div>
          <Button variant="outline" type="button" size="lg" className="w-full">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path
                d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                fill="currentColor"
              />
            </svg>
            Login with GitHub
          </Button>
          <FieldDescription className="text-center mt-2" style={{ color: "var(--color-text-secondary)" }}>
            Don&apos;t have an account?{" "}
            <a href="#" className="underline underline-offset-4" style={{ color: "var(--color-text-primary)" }}>
              Sign up
            </a>
          </FieldDescription>
        </div>
      </FieldGroup>
    </form>
  )
}
