"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import {
  Plus, Note, TextB, TextItalic, ListBullets,
  ListNumbers, Quotes, TrashSimple,
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/confirm-dialog"

// ─── Types ────────────────────────────────────────────────────────────────────

type NoteRecord = {
  id: string
  title: string
  content: string
  updatedAt: string
}

type ApiRecord = {
  id: string
  data: Record<string, unknown>
  updatedAt: string
}

function toNote(r: ApiRecord): NoteRecord {
  return {
    id: r.id,
    title: (r.data.title as string) || "Untitled",
    content: (r.data.content as string) || "",
    updatedAt: r.updatedAt,
  }
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function NotesApp() {
  const [notes, setNotes]     = useState<NoteRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/records?type=notes&limit=200")
      .then((r) => r.json())
      .then((json: { records: ApiRecord[] }) => {
        const loaded = json.records.map(toNote)
        setNotes(loaded)
        if (loaded.length > 0) setSelectedId(loaded[0].id)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const createNote = async () => {
    const res = await fetch("/api/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ object_type: "notes", data: { title: "Untitled", content: "" } }),
    })
    if (res.ok) {
      const record: ApiRecord = await res.json()
      const note = toNote(record)
      setNotes((prev) => [note, ...prev])
      setSelectedId(note.id)
      toast.success("Note created")
    }
  }

  const updateNote = useCallback((id: string, patch: Partial<NoteRecord>) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n))
    )
    fetch(`/api/records/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
  }, [])

  const deleteNote = async (id: string) => {
    try {
      await fetch(`/api/records/${id}`, { method: "DELETE" })
      setNotes((prev) => {
        const rest = prev.filter((n) => n.id !== id)
        if (selectedId === id) setSelectedId(rest[0]?.id ?? null)
        return rest
      })
      toast.success("Note deleted")
    } catch {
      toast.error("Failed to delete note")
    }
    setConfirmDeleteId(null)
  }

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null

  if (loading) return <NotesSkeleton />

  return (
    <div
      className="flex h-full overflow-hidden"
      style={{ background: "var(--color-bg-surface)" }}
    >
      {/* ── Sidebar ── */}
      <div
        className="flex flex-col shrink-0 border-r overflow-hidden"
        style={{ width: 260, borderColor: "var(--color-border)" }}
      >
        {/* Sidebar header */}
        <div
          className="flex items-center justify-between px-4 shrink-0 border-b"
          style={{ height: 44, borderColor: "var(--color-border)" }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
            Notes
          </span>
          <button
            onClick={createNote}
            className="flex items-center justify-center rounded-lg transition-colors hover:bg-black/5"
            style={{ width: 26, height: 26, color: "var(--color-text-tertiary)" }}
            title="New note"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Note list */}
        <div className="flex-1 overflow-y-auto">
          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 px-4">
              <Note size={28} style={{ color: "var(--color-text-tertiary)" }} />
              <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", textAlign: "center" }}>
                No notes yet.<br />Create one to get started.
              </p>
            </div>
          ) : (
            notes.map((note) => (
              <NoteListItem
                key={note.id}
                note={note}
                active={note.id === selectedId}
                onClick={() => setSelectedId(note.id)}
                onDelete={() => setConfirmDeleteId(note.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Editor ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedNote ? (
          <NoteEditor
            key={selectedNote.id}
            note={selectedNote}
            onChange={(patch) => updateNote(selectedNote.id, patch)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Note size={36} style={{ color: "var(--color-text-tertiary)" }} />
            <p style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>
              Select a note or create a new one
            </p>
            <button
              onClick={createNote}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white transition-opacity hover:opacity-90"
              style={{ fontSize: 13, fontWeight: 500, background: "var(--color-accent)" }}
            >
              <Plus size={13} />
              New note
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => { if (!open) setConfirmDeleteId(null) }}
        title="Delete note"
        description="This note will be permanently deleted. This action cannot be undone."
        onConfirm={() => confirmDeleteId && deleteNote(confirmDeleteId)}
      />
    </div>
  )
}

// ─── Note list item ───────────────────────────────────────────────────────────

function NoteListItem({
  note,
  active,
  onClick,
  onDelete,
}: {
  note: NoteRecord
  active: boolean
  onClick: () => void
  onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const preview = note.content.replace(/<[^>]+>/g, " ").trim().slice(0, 80)

  const date = new Date(note.updatedAt)
  const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" })

  return (
    <div
      className="relative px-4 py-3 cursor-pointer border-b"
      style={{
        borderColor: "var(--color-border)",
        background: active
          ? "var(--color-accent-light)"
          : hovered
          ? "var(--color-bg-subtle)"
          : "transparent",
        transition: "background 0.08s ease",
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="truncate"
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: active ? "var(--color-accent)" : "var(--color-text-primary)",
            lineHeight: 1.3,
          }}
        >
          {note.title}
        </span>
        <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", flexShrink: 0, whiteSpace: "nowrap" }}>
          {dateStr}
        </span>
      </div>
      {preview && (
        <p
          className="mt-0.5 truncate"
          style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}
        >
          {preview}
        </p>
      )}

      {/* Delete button on hover */}
      {hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="absolute right-2 bottom-2 flex items-center justify-center rounded-md transition-colors hover:bg-red-50"
          style={{ width: 22, height: 22, color: "#EF4444" }}
        >
          <TrashSimple size={12} />
        </button>
      )}
    </div>
  )
}

// ─── Note editor ──────────────────────────────────────────────────────────────

function NoteEditor({
  note,
  onChange,
}: {
  note: NoteRecord
  onChange: (patch: Partial<NoteRecord>) => void
}) {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Start writing…",
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    content: note.content,
    onUpdate({ editor }) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      debounceTimer.current = setTimeout(() => {
        onChange({ content: editor.getHTML() })
      }, 600)
    },
    editorProps: {
      attributes: {
        class: "outline-none w-full h-full",
        style: "font-size:15px; line-height:1.7; color:var(--color-text-primary)",
      },
    },
  })

  const [titleDraft, setTitleDraft] = useState(note.title)

  const commitTitle = () => {
    const trimmed = titleDraft.trim() || "Untitled"
    if (trimmed !== note.title) onChange({ title: trimmed })
    setTitleDraft(trimmed)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div
        className="flex items-center gap-1 px-5 shrink-0 border-b overflow-x-auto"
        style={{ height: 40, borderColor: "var(--color-border)" }}
      >
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBold().run()}
          active={editor?.isActive("bold")}
          title="Bold"
        >
          <TextB size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          active={editor?.isActive("italic")}
          title="Italic"
        >
          <TextItalic size={14} />
        </ToolbarButton>
        <div style={{ width: 1, height: 16, background: "var(--color-border)", margin: "0 4px" }} />
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          active={editor?.isActive("bulletList")}
          title="Bullet list"
        >
          <ListBullets size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          active={editor?.isActive("orderedList")}
          title="Numbered list"
        >
          <ListNumbers size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          active={editor?.isActive("blockquote")}
          title="Quote"
        >
          <Quotes size={14} />
        </ToolbarButton>
      </div>

      {/* Title */}
      <div className="px-8 pt-8 pb-2 shrink-0">
        <input
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), editor?.commands.focus())}
          className="w-full bg-transparent outline-none"
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: "var(--color-text-primary)",
            lineHeight: 1.2,
          }}
          placeholder="Untitled"
        />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-8 pb-16">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  )
}

// ─── Toolbar button ───────────────────────────────────────────────────────────

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center justify-center rounded-md transition-colors"
      style={{
        width: 26,
        height: 26,
        background: active ? "var(--color-accent-light)" : "transparent",
        color: active ? "var(--color-accent)" : "var(--color-text-tertiary)",
      }}
    >
      {children}
    </button>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function NotesSkeleton() {
  return (
    <div className="flex h-full" style={{ background: "var(--color-bg-surface)" }}>
      <div
        className="flex flex-col shrink-0 border-r"
        style={{ width: 260, borderColor: "var(--color-border)" }}
      >
        <div style={{ height: 44, borderBottom: "1px solid var(--color-border)" }} />
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-1.5 px-4 py-3 border-b"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div className="h-3 rounded-full animate-pulse" style={{ width: "70%", background: "var(--color-border)" }} />
            <div className="h-2.5 rounded-full animate-pulse" style={{ width: "50%", background: "var(--color-border)" }} />
          </div>
        ))}
      </div>
      <div className="flex-1 px-8 pt-8">
        <div className="h-7 rounded-full animate-pulse mb-6" style={{ width: "40%", background: "var(--color-border)" }} />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-3 rounded-full animate-pulse mb-3" style={{ width: `${70 - i * 8}%`, background: "var(--color-border)" }} />
        ))}
      </div>
    </div>
  )
}
