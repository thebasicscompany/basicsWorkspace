// ─── Raw API shapes ───────────────────────────────────────────────────────────

export type ApiRecord = {
  id: string
  orgId: string
  objectType: string
  data: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

// ─── CRM entity types ─────────────────────────────────────────────────────────

export type Contact = {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  status?: string
  createdAt?: string
}

export type Company = {
  id: string
  name: string
  domain?: string
  industry?: string
  size?: string
  createdAt?: string
}

export type Deal = {
  id: string
  name: string
  status?: string
  amount?: number
  company?: string
  closedAt?: string
  createdAt?: string
}

// ─── Transforms ───────────────────────────────────────────────────────────────

function str(v: unknown): string {
  return v != null ? String(v) : ""
}

export function toContact(r: ApiRecord): Contact {
  const d = r.data
  const name =
    d.name
      ? str(d.name)
      : [str(d.firstName), str(d.lastName)].filter(Boolean).join(" ") || "Unnamed"
  return {
    id: r.id,
    name,
    email: str(d.email),
    phone: str(d.phone) || undefined,
    company: str(d.company ?? d.companyName) || undefined,
    status: str(d.status) || undefined,
    createdAt: r.createdAt,
  }
}

export function toCompany(r: ApiRecord): Company {
  const d = r.data
  return {
    id: r.id,
    name: str(d.name) || "Unnamed",
    domain: str(d.domain) || undefined,
    industry: str(d.industry) || undefined,
    size: str(d.size) || undefined,
    createdAt: r.createdAt,
  }
}

export function toDeal(r: ApiRecord): Deal {
  const d = r.data
  return {
    id: r.id,
    name: str(d.name) || "Unnamed",
    status: str(d.status) || undefined,
    amount: d.amount != null ? Number(d.amount) : undefined,
    company: str(d.company ?? d.companyName) || undefined,
    closedAt: str(d.closedAt) || undefined,
    createdAt: r.createdAt,
  }
}
