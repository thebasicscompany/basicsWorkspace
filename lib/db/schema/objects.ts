import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

export type ObjectField = {
  id: string
  name: string
  key: string
  type:
    | "text"
    | "number"
    | "date"
    | "select"
    | "multi_select"
    | "relation"
    | "checkbox"
    | "url"
    | "email"
    | "phone"
  required: boolean
  options?: { id: string; label: string; color: string }[]
  relationTo?: string
  position: number
}

export const objectConfig = pgTable(
  "object_config",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    namePlural: text("name_plural").notNull(),
    icon: text("icon").notNull(),
    color: text("color").notNull(),
    fields: jsonb("fields").notNull().$type<ObjectField[]>().$default(() => []),
    isSystem: boolean("is_system").notNull().default(false),
    position: integer("position").notNull(),
  },
  (table) => [
    uniqueIndex("object_config_org_slug_unique").on(table.orgId, table.slug),
  ]
)

export const records = pgTable(
  "records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id").notNull(),
    objectType: text("object_type").notNull(),
    data: jsonb("data").notNull().$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("records_org_type_created_idx").on(
      table.orgId,
      table.objectType,
      table.createdAt
    ),
  ]
)
