import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { user } from "./auth"

/** A chat thread (conversation) owned by a user */
export const chatThreads = pgTable(
  "chat_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("New conversation"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("chat_threads_user_idx").on(table.userId),
  ]
)

/** A single message within a chat thread */
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => chatThreads.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // 'user' | 'assistant' | 'system' | 'tool'
    content: text("content"), // text content (null for pure tool-call messages)
    toolCalls: jsonb("tool_calls").$type<unknown[]>(), // tool call array for assistant messages
    toolResults: jsonb("tool_results").$type<unknown[]>(), // tool result for tool messages
    metadata: jsonb("metadata").$type<Record<string, unknown>>(), // arbitrary metadata
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("chat_messages_thread_idx").on(table.threadId),
  ]
)
