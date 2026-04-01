# UI/UX Gaps & Plan

> What's missing from basics-workspace to make users love it AND enterprises buy it.

## Current State Summary

- **Design quality:** 8/10 — cohesive, warm, professional (emerald green + warm beige)
- **Feature coverage:** 6/10 — core apps work (CRM, Tasks, Notes, Automations, Context, Objects) but incomplete
- **Enterprise readiness:** 4/10 — no permissions, no audit trail, no invite flow
- **Consumer readiness:** 6/10 — delightful design but no feedback on actions, no onboarding

---

## Critical Gaps (users will bounce without these)

### 1. No feedback on actions
Sonner is installed but never wired up. Users save a note, delete a contact, deploy a workflow — and get zero confirmation. Every mutation needs a toast. This is the single biggest UX gap.

### 2. No confirmation dialogs for destructive actions
Delete a contact? Gone. No "are you sure?" The Dialog component exists but isn't used for confirms.

### 3. No error boundaries
No `error.tsx` anywhere. No `not-found.tsx`. No global error page. If something breaks, users see a white screen.

### 4. Command palette is built but not wired
`cmdk` is installed and a `CommandDialog` component exists — but no `Cmd+K` shortcut, no global search. For a workspace app, this is table stakes. Enterprises expect fast navigation.

### 5. No dark mode
CSS vars for dark mode are partially defined but not functional. Enterprise users working late hours care about this. It's also a signal of polish.

---

## Enterprise Blockers (deals will stall without these)

### 6. No roles/permissions
Every user sees everything. Enterprises need at minimum: Admin, Member, Viewer. Better Auth supports this — it's just not wired.

### 7. No audit trail
Who deleted that contact? Who deployed that workflow? `logContextEvent()` exists but there's no user-facing audit log. Enterprises require this for compliance.

### 8. No team invites
No way to invite users to a workspace. No invite flow, no email, no link sharing. The org plugin in Better Auth supports this — needs UI.

### 9. No SSO/SAML
Enterprise sales will ask about this on call one. Better Auth has plugins for OIDC — worth planning even if not built yet.

### 10. Incomplete auth flows
No signup page (only seeded users), no password reset, no email verification. The "Forgot password?" link is dead.

---

## Polish That Signals Quality (users & buyers notice)

### 11. Toast system for all mutations
Wire up Sonner globally in the root layout. Every API call that mutates data should toast success/error.

### 12. Skeleton loaders for tables
CRM tables show nothing while loading. Add skeleton rows.

### 13. Mobile responsiveness
The 64px sidebar is fixed on all viewports. On mobile it eats the screen. Needs a hamburger menu or collapsible sidebar.

### 14. Onboarding/first-run
Users land on the launchpad with a greeting but no guidance. A simple checklist ("Connect your first integration", "Create your first automation") would dramatically improve activation.

### 15. Keyboard shortcuts
No shortcuts exist beyond browser defaults. At minimum: `Cmd+K` (search), `Cmd+N` (new), `Escape` (close panels). Power users expect this from a workspace tool.

### 16. Inline editing in tables
CRM tables are read-only — you have to click into the detail view to edit. Inline cell editing is what users expect from modern CRM/spreadsheet UIs.

### 17. Bulk operations
No multi-select, no batch delete, no batch update. CRM with 500 contacts and no bulk actions is unusable.

### 18. Saved views/filters
CRM has filtering but no way to save a filter as a "view." Enterprise users create views like "My Open Deals" or "Contacts Added This Week."

### 19. CSV/bulk import
Export exists but import doesn't. First thing a new team does is import their existing data.

### 20. Real-time updates
No WebSocket or polling. If two users are on the same CRM page, changes don't sync. For a team workspace, this matters.

---

## "Wow Factor" Features (differentiation)

### 21. AI-powered empty states
Instead of "No contacts yet" — "Describe your contacts and I'll set up your CRM." Use the existing copilot/agent infrastructure.

### 22. Cross-app command bar
The Context app already links events across apps. Surface this in the command palette — "Show me all activity related to Acme Corp" should search CRM + Tasks + Notes + Automations.

### 23. Workspace templates
"Sales Team" template pre-installs CRM + Tasks + Automations with starter workflows. "Engineering Team" gets different defaults. Reduces time-to-value.

### 24. Activity feed on dashboard
The launchpad greeting is nice but static. Show a live feed: "John added 3 contacts", "Sales Pipeline automation ran successfully", "2 tasks overdue."

### 25. Notification center
Bell icon in the header. Automation failures, task assignments, mentions — all in one place. Enterprises need this for accountability.

---

## Priority Stack Rank

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| **P0** | Toast system (Sonner) | Small | Huge — every action needs feedback |
| **P0** | Confirmation dialogs | Small | Huge — prevents data loss |
| **P0** | Error boundaries + 404 | Small | Huge — prevents white screens |
| **P1** | Cmd+K command palette | Medium | High — fast navigation |
| **P1** | Signup + password reset | Medium | High — can't onboard users without it |
| **P1** | Team invites | Medium | High — multiplayer is the point |
| **P1** | Roles/permissions | Medium | High — enterprise requirement |
| **P2** | Dark mode | Medium | Medium — polish signal |
| **P2** | Onboarding checklist | Medium | Medium — activation |
| **P2** | Keyboard shortcuts | Small | Medium — power users |
| **P2** | Audit log UI | Medium | Medium — enterprise compliance |
| **P2** | Mobile responsive sidebar | Medium | Medium — if targeting mobile |
| **P3** | Bulk operations | Large | Medium — CRM usability |
| **P3** | CSV import | Medium | Medium — onboarding |
| **P3** | Saved views | Large | Medium — enterprise CRM |
| **P3** | Real-time sync | Large | Medium — team collaboration |
| **P3** | SSO/SAML | Large | High for enterprise — but can wait |

---

## Existing Strengths (keep doing these)

- Warm, cohesive design system with CSS custom properties
- Smooth Framer Motion animations (tap effects, page transitions)
- Clean sidebar + breadcrumb navigation
- Phosphor icons used consistently
- Good component primitives (Button, Dialog, Select, Combobox, Tabs, etc.)
- Cross-app Context timeline (linking events across CRM, Tasks, Notes)
- Automations canvas is fully functional (ReactFlow, block editor, copilot)
- Kanban board with drag-drop (dnd-kit)
- Rich text notes (TipTap)
- TypeScript throughout

## What Exists But Needs Wiring

| Component | Status | What's needed |
|-----------|--------|---------------|
| `CommandDialog` (cmdk) | Built, unused | Wire to `Cmd+K`, populate with actions |
| Sonner (toast) | Installed, unused | Add `<Toaster />` to root layout, call on mutations |
| Dark mode CSS vars | Partially defined | Complete variable set, add theme toggle |
| Better Auth org plugin | Configured | Build invite UI, role assignment |
| `EmptyState` component | Used sparingly | Add to all empty views with actionable CTAs |
| Filter system (CRM) | Basic filtering works | Add save-as-view, date ranges, multi-select |
