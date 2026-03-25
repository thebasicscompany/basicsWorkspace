import {
  TextT,
  Hash,
  CalendarBlank,
  ListBullets,
  ListChecks,
  ArrowsLeftRight,
  CheckSquare,
  Link,
  At,
  Phone,
} from "@phosphor-icons/react"
import type { ObjectField } from "@/lib/db/schema"

export type FieldTypeMeta = {
  type: ObjectField["type"]
  label: string
  icon: React.ElementType
  description: string
}

export const FIELD_TYPES: FieldTypeMeta[] = [
  { type: "text",         label: "Text",         icon: TextT,           description: "Single or multi-line text" },
  { type: "number",       label: "Number",       icon: Hash,            description: "Integer or decimal" },
  { type: "date",         label: "Date",         icon: CalendarBlank,   description: "Date or date-time" },
  { type: "select",       label: "Select",       icon: ListBullets,     description: "Single option from a list" },
  { type: "multi_select", label: "Multi-select", icon: ListChecks,      description: "Multiple options" },
  { type: "relation",     label: "Relation",     icon: ArrowsLeftRight, description: "Link to another object" },
  { type: "checkbox",     label: "Checkbox",     icon: CheckSquare,     description: "True / false" },
  { type: "url",          label: "URL",          icon: Link,            description: "Web address" },
  { type: "email",        label: "Email",        icon: At,              description: "Email address" },
  { type: "phone",        label: "Phone",        icon: Phone,           description: "Phone number" },
]

export function getFieldTypeMeta(type: ObjectField["type"]): FieldTypeMeta {
  return FIELD_TYPES.find((f) => f.type === type) ?? FIELD_TYPES[0]
}

export const OPTION_COLORS = [
  { id: "gray",   bg: "bg-zinc-100",   text: "text-zinc-600"   },
  { id: "red",    bg: "bg-red-100",    text: "text-red-600"    },
  { id: "orange", bg: "bg-orange-100", text: "text-orange-600" },
  { id: "yellow", bg: "bg-yellow-100", text: "text-yellow-600" },
  { id: "green",  bg: "bg-green-100",  text: "text-green-700"  },
  { id: "blue",   bg: "bg-blue-100",   text: "text-blue-600"   },
  { id: "purple", bg: "bg-purple-100", text: "text-purple-600" },
]
