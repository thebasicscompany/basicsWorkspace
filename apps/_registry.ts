/**
 * Central registry of all installed apps.
 *
 * To add a new app:
 *   1. Create apps/{slug}/manifest.ts  satisfying AppManifest
 *   2. Import and add it to INSTALLED_APPS below
 *   3. Create app/{slug}/page.tsx as a thin Next.js route
 *
 * Order in this array controls launchpad display order.
 */
import { automationsApp }      from "./automations/manifest"
import { crmApp }              from "./crm/manifest"
import { tasksApp }            from "./tasks/manifest"
import { notesApp }            from "./notes/manifest"
import { meetingsApp }         from "./meetings/manifest"
import { meetingAssistantApp } from "./meeting-assistant/manifest"
import { objectsApp }          from "./objects/manifest"
import type { AppManifest }    from "./_types"

export const INSTALLED_APPS: AppManifest[] = [
  automationsApp,
  crmApp,
  tasksApp,
  notesApp,
  meetingsApp,
  meetingAssistantApp,
  objectsApp,
]

export type { AppManifest }
