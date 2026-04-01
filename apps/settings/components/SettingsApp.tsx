"use client"

import { useState, useEffect, useCallback } from "react"
import {
  User,
  Robot,
  Palette,
  Lock,
  Eye,
  EyeSlash,
  Check,
  CircleNotch,
  Buildings,
  Key,
  Plus,
  Trash,
} from "@phosphor-icons/react"

// ─── Types ───────────────────────────────────────────────────────────────────

type Section = "profile" | "automation" | "appearance" | "security" | "workspace" | "secrets"

interface SettingsData {
  profile: { name: string; email: string }
  gateway: { gatewayUrl: string; gatewayApiKey: string }
  org: { name: string }
}

// ─── Nav ─────────────────────────────────────────────────────────────────────

const NAV: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "profile",    label: "Profile",    icon: User      },
  { id: "workspace",  label: "Workspace",  icon: Buildings },
  { id: "automation", label: "Automation", icon: Robot     },
  { id: "secrets",    label: "Secrets",    icon: Key       },
  { id: "appearance", label: "Appearance", icon: Palette   },
  { id: "security",   label: "Security",   icon: Lock      },
]

// ─── Shared primitives ───────────────────────────────────────────────────────

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-[15px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
        {title}
      </h2>
      {description && (
        <p className="mt-0.5 text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
          {description}
        </p>
      )}
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium" style={{ color: "var(--color-text-primary)" }}>
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
          {hint}
        </p>
      )}
    </div>
  )
}

function TextInput({
  value,
  onChange,
  placeholder,
  disabled,
  readOnly,
  type = "text",
}: {
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      className="w-full px-3 py-2 text-[13px] rounded-[8px] border outline-none transition-colors"
      style={{
        background: readOnly || disabled ? "var(--color-bg-base)" : "var(--color-bg-surface)",
        borderColor: "var(--color-border)",
        color: readOnly || disabled ? "var(--color-text-secondary)" : "var(--color-text-primary)",
      }}
      onFocus={(e) => {
        if (!readOnly && !disabled)
          e.target.style.borderColor = "var(--color-accent)"
      }}
      onBlur={(e) => {
        e.target.style.borderColor = "var(--color-border)"
      }}
    />
  )
}

function PasswordInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-3 py-2 pr-10 text-[13px] rounded-[8px] border outline-none transition-colors"
        style={{
          background: "var(--color-bg-surface)",
          borderColor: "var(--color-border)",
          color: "var(--color-text-primary)",
        }}
        onFocus={(e) => { e.target.style.borderColor = "var(--color-accent)" }}
        onBlur={(e) => { e.target.style.borderColor = "var(--color-border)" }}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
        style={{ color: "var(--color-text-tertiary)" }}
        tabIndex={-1}
      >
        {show ? <EyeSlash size={14} /> : <Eye size={14} />}
      </button>
    </div>
  )
}

function SaveButton({
  onClick,
  loading,
  saved,
  disabled,
}: {
  onClick: () => void
  loading: boolean
  saved: boolean
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="flex items-center gap-2 px-4 py-2 rounded-[8px] text-[13px] font-medium text-white transition-all"
      style={{
        background: saved ? "#2563EB" : "var(--color-accent)",
        opacity: disabled || loading ? 0.7 : 1,
      }}
    >
      {loading ? (
        <CircleNotch size={13} className="animate-spin" />
      ) : saved ? (
        <Check size={13} weight="bold" />
      ) : null}
      {saved ? "Saved" : "Save changes"}
    </button>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-[12px] border p-6"
      style={{
        background: "var(--color-bg-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      {children}
    </div>
  )
}

function StubBadge() {
  return (
    <span
      className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
      style={{
        background: "var(--color-bg-base)",
        color: "var(--color-text-tertiary)",
        border: "1px solid var(--color-border)",
      }}
    >
      Coming soon
    </span>
  )
}

// ─── Sections ────────────────────────────────────────────────────────────────

function ProfileSection({ data, onSave }: { data: SettingsData | null; onSave: (patch: Partial<SettingsData>) => Promise<void> }) {
  const [name, setName] = useState(data?.profile.name ?? "")
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { if (data) setName(data.profile.name) }, [data])

  async function handleSave() {
    setLoading(true)
    await onSave({ profile: { name, email: data?.profile.email ?? "" } })
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const initials = name
    ? name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?"

  return (
    <div className="space-y-4">
      <SectionHeading
        title="Profile"
        description="Your personal information visible across the workspace."
      />
      <Card>
        <div className="flex items-center gap-4 mb-6 pb-6 border-b" style={{ borderColor: "var(--color-border)" }}>
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-semibold shrink-0"
            style={{ background: "var(--color-accent)" }}
          >
            {initials}
          </div>
          <div>
            <p className="text-[13px] font-medium" style={{ color: "var(--color-text-primary)" }}>
              {name || "—"}
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
              {data?.profile.email ?? "—"}
            </p>
            <button
              className="mt-1.5 text-[12px] flex items-center gap-1"
              style={{ color: "var(--color-text-tertiary)" }}
              disabled
            >
              Change avatar <StubBadge />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <Field label="Display name">
            <TextInput
              value={name}
              onChange={setName}
              placeholder="Your name"
              disabled={!data}
            />
          </Field>

          <Field
            label="Email address"
            hint="Contact support to change your email address."
          >
            <TextInput value={data?.profile.email ?? ""} readOnly />
          </Field>
        </div>

        <div className="mt-6 flex justify-end">
          <SaveButton
            onClick={handleSave}
            loading={loading}
            saved={saved}
            disabled={!data}
          />
        </div>
      </Card>
    </div>
  )
}

function WorkspaceSection({ data, onSave }: { data: SettingsData | null; onSave: (patch: Partial<SettingsData>) => Promise<void> }) {
  const [orgName, setOrgName] = useState(data?.org.name ?? "")
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { if (data) setOrgName(data.org.name) }, [data])

  async function handleSave() {
    setLoading(true)
    // Stub — org rename needs a separate API
    await new Promise((r) => setTimeout(r, 600))
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4">
      <SectionHeading
        title="Workspace"
        description="Settings for your organization."
      />
      <Card>
        <div className="space-y-4">
          <Field label="Workspace name" hint="Visible to all members of your organization.">
            <TextInput
              value={orgName}
              onChange={setOrgName}
              placeholder="Acme Inc."
              disabled={!data}
            />
          </Field>
          <Field label="Workspace slug" hint="Used in URLs. Contact support to change.">
            <TextInput value="" placeholder="acme" readOnly />
          </Field>
        </div>
        <div className="mt-6 flex justify-end">
          <SaveButton onClick={handleSave} loading={loading} saved={saved} disabled={!data} />
        </div>
      </Card>
    </div>
  )
}

function AutomationSection({ data, onSave }: { data: SettingsData | null; onSave: (patch: Partial<SettingsData>) => Promise<void> }) {
  const [gatewayUrl, setGatewayUrl] = useState(data?.gateway.gatewayUrl ?? "")
  const [gatewayApiKey, setGatewayApiKey] = useState(data?.gateway.gatewayApiKey ?? "")
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (data) {
      setGatewayUrl(data.gateway.gatewayUrl)
      setGatewayApiKey(data.gateway.gatewayApiKey)
    }
  }, [data])

  async function handleSave() {
    setLoading(true)
    await onSave({ gateway: { gatewayUrl, gatewayApiKey } })
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4">
      <SectionHeading
        title="Automation"
        description="Configure the gateway that powers your workflow automations and AI blocks."
      />
      <Card>
        <div className="space-y-4">
          <Field
            label="Gateway URL"
            hint="The base URL of your Basics gateway. Defaults to the environment variable if left blank."
          >
            <TextInput
              value={gatewayUrl}
              onChange={setGatewayUrl}
              placeholder={process.env.NEXT_PUBLIC_GATEWAY_URL ?? "https://gateway.example.com"}
              disabled={!data}
            />
          </Field>

          <Field
            label="Gateway API key"
            hint="Used to authenticate all workflow block executions. Stored encrypted."
          >
            <PasswordInput
              value={gatewayApiKey}
              onChange={setGatewayApiKey}
              placeholder="sk-••••••••••••••••"
              disabled={!data}
            />
          </Field>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
            The API key is saved per-organization and never sent to the client.
          </p>
          <SaveButton onClick={handleSave} loading={loading} saved={saved} disabled={!data} />
        </div>
      </Card>
    </div>
  )
}

function AppearanceSection() {
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system")
  const themes = [
    { id: "system" as const, label: "System" },
    { id: "light"  as const, label: "Light"  },
    { id: "dark"   as const, label: "Dark"   },
  ]

  return (
    <div className="space-y-4">
      <SectionHeading
        title="Appearance"
        description="Customize how Basics looks for you."
      />
      <Card>
        <Field label="Theme">
          <div className="flex gap-2 mt-1">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className="flex-1 py-2 rounded-[8px] text-[13px] font-medium border transition-all"
                style={{
                  background: theme === t.id ? "var(--color-accent-light)" : "var(--color-bg-surface)",
                  borderColor: theme === t.id ? "var(--color-accent)" : "var(--color-border)",
                  color: theme === t.id ? "var(--color-accent)" : "var(--color-text-secondary)",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Field>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StubBadge />
            <p className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
              Dark mode coming in a future release.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

function SecuritySection() {
  return (
    <div className="space-y-4">
      <SectionHeading
        title="Security"
        description="Manage your password and active sessions."
      />
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium" style={{ color: "var(--color-text-primary)" }}>
              Password
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
              Last changed: never
            </p>
          </div>
          <button
            disabled
            className="px-3 py-1.5 rounded-[8px] text-[13px] font-medium border flex items-center gap-2"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-text-tertiary)",
              background: "var(--color-bg-base)",
            }}
          >
            Change password <StubBadge />
          </button>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium" style={{ color: "var(--color-text-primary)" }}>
              Active sessions
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
              1 session active
            </p>
          </div>
          <button
            disabled
            className="px-3 py-1.5 rounded-[8px] text-[13px] font-medium border flex items-center gap-2"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-text-tertiary)",
              background: "var(--color-bg-base)",
            }}
          >
            Manage <StubBadge />
          </button>
        </div>
      </Card>
    </div>
  )
}

// ─── Secrets (Environment Variables) ──────────────────────────────────────────

function SecretsSection() {
  const [vars, setVars] = useState<{ key: string; value: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch("/api/environment")
      .then((r) => r.ok ? r.json() : { data: {} })
      .then((json) => {
        const data = json.data ?? {}
        const entries = Object.entries(data).map(([key, val]: [string, any]) => ({
          key,
          value: typeof val === "object" && val !== null && "value" in val ? val.value : String(val),
        }))
        setVars(entries)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function addVar() {
    setVars((prev) => [...prev, { key: "", value: "" }])
  }

  function updateVar(index: number, field: "key" | "value", val: string) {
    setVars((prev) => prev.map((v, i) => (i === index ? { ...v, [field]: val } : v)))
  }

  function removeVar(index: number) {
    setVars((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setSaving(true)
    const record: Record<string, string> = {}
    for (const v of vars) {
      if (v.key.trim()) record[v.key.trim()] = v.value
    }
    await fetch("/api/environment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variables: record }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4">
      <SectionHeading
        title="Secrets"
        description="Environment variables available in your workflows via {{variable_name}} syntax."
      />
      <Card>
        {loading ? (
          <div className="flex items-center gap-2 text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>
            <CircleNotch size={14} className="animate-spin" /> Loading...
          </div>
        ) : (
          <div className="space-y-3">
            {vars.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={v.key}
                  onChange={(e) => updateVar(i, "key", e.target.value)}
                  placeholder="VARIABLE_NAME"
                  className="flex-1 px-3 py-2 text-[13px] rounded-[8px] border outline-none font-mono"
                  style={{
                    background: "var(--color-bg-surface)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-primary)",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "var(--color-accent)" }}
                  onBlur={(e) => { e.target.style.borderColor = "var(--color-border)" }}
                />
                <PasswordInput
                  value={v.value}
                  onChange={(val) => updateVar(i, "value", val)}
                  placeholder="value"
                />
                <button
                  onClick={() => removeVar(i)}
                  className="p-2 rounded-[8px] transition-colors hover:bg-red-50"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  <Trash size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={addVar}
              className="flex items-center gap-1.5 text-[13px] font-medium transition-colors"
              style={{ color: "var(--color-accent)" }}
            >
              <Plus size={13} weight="bold" />
              Add variable
            </button>
          </div>
        )}
      </Card>
      <SaveButton onClick={handleSave} loading={saving} saved={saved} disabled={vars.some((v) => !v.key.trim())} />
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function SettingsApp() {
  const [activeSection, setActiveSection] = useState<Section>("profile")
  const [data, setData] = useState<SettingsData | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setLoadError(true))
  }, [])

  const handleSave = useCallback(async (patch: Partial<SettingsData>) => {
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
  }, [])

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left nav */}
      <nav
        className="w-52 shrink-0 flex flex-col py-6 px-3 border-r overflow-y-auto"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-bg-sidebar)",
        }}
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-wider px-3 mb-2"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          Settings
        </p>
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = activeSection === id
          return (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[13px] font-medium transition-all w-full text-left"
              style={{
                background: active ? "var(--color-accent-light)" : "transparent",
                color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
              }}
            >
              <Icon size={15} weight={active ? "fill" : "regular"} />
              {label}
            </button>
          )
        })}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[560px] py-8 px-8">
          {loadError && (
            <div
              className="mb-4 px-4 py-3 rounded-[8px] text-[13px]"
              style={{
                background: "#FEF2F2",
                color: "#EF4444",
                border: "1px solid #FECACA",
              }}
            >
              Failed to load settings. Please refresh.
            </div>
          )}

          {activeSection === "profile"    && <ProfileSection    data={data} onSave={handleSave} />}
          {activeSection === "workspace"  && <WorkspaceSection  data={data} onSave={handleSave} />}
          {activeSection === "automation" && <AutomationSection data={data} onSave={handleSave} />}
          {activeSection === "secrets"    && <SecretsSection />}
          {activeSection === "appearance" && <AppearanceSection />}
          {activeSection === "security"   && <SecuritySection   />}
        </div>
      </main>
    </div>
  )
}
