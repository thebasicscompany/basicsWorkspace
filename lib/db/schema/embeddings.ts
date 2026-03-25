import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { vector } from "drizzle-orm/pg-core"

// dimension matches gateway embedding model; update here if model changes
export const contextEmbeddings = pgTable(
  "context_embeddings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    chunkIndex: integer("chunk_index").notNull().default(0),
    chunkText: text("chunk_text").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    model: text("model").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("context_embeddings_entity_idx").on(table.entityType, table.entityId),
    uniqueIndex("context_embeddings_unique").on(
      table.entityType,
      table.entityId,
      table.chunkIndex
    ),
  ]
)
