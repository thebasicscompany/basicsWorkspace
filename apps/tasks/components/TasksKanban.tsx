"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Plus, Flag } from "@phosphor-icons/react"

// ─── Types ────────────────────────────────────────────────────────────────────

export type Task = {
  id: string
  title: string
  status: "todo" | "in_progress" | "done"
  priority?: "low" | "medium" | "high"
  dueDate?: string
}

type ApiRecord = {
  id: string
  data: Record<string, unknown>
  createdAt: string
}

export function toTask(r: ApiRecord): Task {
  const d = r.data
  return {
    id: r.id,
    title: (d.title as string) ?? "Untitled",
    status: (d.status as Task["status"]) ?? "todo",
    priority: d.priority as Task["priority"],
    dueDate: d.dueDate as string | undefined,
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────

const COLUMNS: { id: Task["status"]; label: string }[] = [
  { id: "todo",        label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "done",        label: "Done" },
]

const PRIORITY_COLOR: Record<string, string> = {
  high:   "var(--color-error)",
  medium: "var(--color-warning)",
  low:    "var(--color-info)",
}

// ─── Board ────────────────────────────────────────────────────────────────────

export function TasksKanban() {
  const [tasks, setTasks]     = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const overId = useRef<string | null>(null)

  useEffect(() => {
    fetch("/api/records?type=tasks&limit=200")
      .then((r) => r.json())
      .then((json: { records: ApiRecord[] }) => setTasks(json.records.map(toTask)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const tasksByColumn = useCallback(
    (col: Task["status"]) => tasks.filter((t) => t.status === col),
    [tasks]
  )

  const findColumn = (id: string): Task["status"] | null => {
    if (COLUMNS.find((c) => c.id === id)) return id as Task["status"]
    return tasks.find((t) => t.id === id)?.status ?? null
  }

  const handleDragStart = ({ active }: DragStartEvent) =>
    setActiveId(active.id as string)

  const handleDragOver = ({ over }: DragOverEvent) => {
    overId.current = over ? (over.id as string) : null
  }

  const handleDragEnd = ({ active }: DragEndEvent) => {
    setActiveId(null)
    const targetCol = overId.current ? findColumn(overId.current) : null
    overId.current = null
    if (!targetCol) return
    const task = tasks.find((t) => t.id === (active.id as string))
    if (!task || task.status === targetCol) return

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: targetCol } : t))
    )
    fetch(`/api/records/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: targetCol }),
    }).catch(() =>
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
      )
    )
  }

  const addTask = async (status: Task["status"]) => {
    const res = await fetch("/api/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ object_type: "tasks", data: { title: "New task", status } }),
    })
    if (res.ok) {
      const record: ApiRecord = await res.json()
      setTasks((prev) => [...prev, toTask(record)])
    }
  }

  const updateTitle = async (id: string, title: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)))
    await fetch(`/api/records/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    })
  }

  const activeTask = tasks.find((t) => t.id === activeId)

  if (loading) return <KanbanSkeleton />

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        className="flex gap-4 h-full overflow-x-auto px-6 py-5"
        style={{ background: "var(--color-bg-base)" }}
      >
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={tasksByColumn(col.id)}
            onAddTask={() => addTask(col.id)}
            onUpdateTitle={updateTitle}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask && <TaskCard task={activeTask} overlay />}
      </DragOverlay>
    </DndContext>
  )
}

// ─── Column ───────────────────────────────────────────────────────────────────

function KanbanColumn({
  column,
  tasks,
  onAddTask,
  onUpdateTitle,
}: {
  column: { id: Task["status"]; label: string }
  tasks: Task[]
  onAddTask: () => void
  onUpdateTitle: (id: string, title: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <div
      className="flex flex-col shrink-0 overflow-hidden"
      style={{
        width: 272,
        background: "var(--color-bg-surface)",
        border: `1px solid ${isOver ? "var(--color-accent)" : "var(--color-border)"}`,
        borderRadius: 12,
        transition: "border-color 0.1s ease",
      }}
    >
      {/* Header — matches notes sidebar header exactly */}
      <div
        className="flex items-center justify-between px-4 shrink-0"
        style={{ height: 44, borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
            {column.label}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--color-text-tertiary)",
              background: "var(--color-bg-base)",
              borderRadius: 9999,
              padding: "1px 6px",
            }}
          >
            {tasks.length}
          </span>
        </div>
        <button
          onClick={onAddTask}
          className="flex items-center justify-center rounded-lg transition-colors hover:bg-black/5"
          style={{ width: 26, height: 26, color: "var(--color-text-tertiary)" }}
          title="Add task"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Card list */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto flex flex-col p-3 gap-1.5"
        style={{
          background: isOver ? "var(--color-accent-light)" : undefined,
          transition: "background 0.1s ease",
        }}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onUpdateTitle={(title) => onUpdateTitle(task.id, title)}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div
            className="flex items-center justify-center rounded-lg"
            style={{ height: 56, border: "1.5px dashed var(--color-border)" }}
          >
            <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
              Drop here
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <button
        onClick={onAddTask}
        className="flex items-center gap-2 px-4 py-2.5 transition-colors hover:bg-black/[0.03] shrink-0"
        style={{
          borderTop: "1px solid var(--color-border)",
          color: "var(--color-text-tertiary)",
        }}
      >
        <Plus size={12} />
        <span style={{ fontSize: 12 }}>Add task</span>
      </button>
    </div>
  )
}

// ─── Task card ────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  overlay,
  onUpdateTitle,
}: {
  task: Task
  overlay?: boolean
  onUpdateTitle?: (title: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id })

  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(task.title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const commitEdit = () => {
    setEditing(false)
    if (draft.trim() && draft !== task.title) onUpdateTitle?.(draft.trim())
    else setDraft(task.title)
  }

  return (
    <div
      ref={setNodeRef}
      {...(overlay ? {} : { ...attributes, ...listeners })}
      className="flex flex-col gap-1.5 rounded-lg px-3 py-2.5 select-none"
      style={{
        background: "var(--color-bg-surface)",
        border: "1px solid var(--color-border)",
        cursor: overlay ? "grabbing" : "grab",
        opacity: isDragging ? 0 : 1,
        transform: CSS.Transform.toString(transform),
        transition,
        boxShadow: overlay
          ? "0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)"
          : "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      {/* Title */}
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitEdit()
            if (e.key === "Escape") { setDraft(task.title); setEditing(false) }
          }}
          className="w-full bg-transparent outline-none"
          style={{ fontSize: 13, color: "var(--color-text-primary)" }}
        />
      ) : (
        <span
          onDoubleClick={() => !overlay && setEditing(true)}
          style={{ fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.4 }}
        >
          {task.title}
        </span>
      )}

      {/* Meta */}
      {(task.priority || task.dueDate) && (
        <div className="flex items-center gap-2">
          {task.priority && (
            <div className="flex items-center gap-1">
              <Flag size={10} weight="fill" style={{ color: PRIORITY_COLOR[task.priority] }} />
              <span style={{ fontSize: 11, color: PRIORITY_COLOR[task.priority], fontWeight: 500, textTransform: "capitalize" }}>
                {task.priority}
              </span>
            </div>
          )}
          {task.dueDate && (
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
              {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function KanbanSkeleton() {
  return (
    <div
      className="flex gap-4 h-full px-6 py-5"
      style={{ background: "var(--color-bg-base)" }}
    >
      {COLUMNS.map((col) => (
        <div
          key={col.id}
          className="flex flex-col shrink-0 overflow-hidden"
          style={{ width: 272, background: "var(--color-bg-surface)", border: "1px solid var(--color-border)", borderRadius: 12 }}
        >
          <div
            className="flex items-center px-4 shrink-0"
            style={{ height: 44, borderBottom: "1px solid var(--color-border)" }}
          >
            <div className="h-3 rounded-full animate-pulse" style={{ width: 64, background: "var(--color-border)" }} />
          </div>
          <div className="flex flex-col gap-1.5 p-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg animate-pulse"
                style={{ height: 48, background: "var(--color-border)" }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
