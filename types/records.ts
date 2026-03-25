// TypeScript interfaces for standard object types.
// The DB is schema-less (JSONB); these types are the TypeScript schema.

export type ContactRecord = {
  firstName: string
  lastName?: string
  email?: string
  phone?: string
  companyId?: string
}

export type CompanyRecord = {
  name: string
  domain?: string
  industry?: string
  size?: string
}

export type DealRecord = {
  name: string
  status?: "open" | "closed_won" | "closed_lost"
  amount?: number
  companyId?: string
  ownerId?: string
  closedAt?: string
}

export type TaskRecord = {
  title: string
  status?: "todo" | "in_progress" | "done"
  dueAt?: string
  assigneeId?: string
  parentType?: string
  parentId?: string
}

export type NoteRecord = {
  body: string
  authorId?: string
  parentType?: string
  parentId?: string
}

export type MeetingRecord = {
  title: string
  transcript?: string
  summary?: string
  recordingUrl?: string
  startedAt?: string
  endedAt?: string
}

export type AnyRecord =
  | ContactRecord
  | CompanyRecord
  | DealRecord
  | TaskRecord
  | NoteRecord
  | MeetingRecord
  | Record<string, unknown>
