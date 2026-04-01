<p align="center">
  <img src="public/logo.png" alt="Basics" width="60" />
</p>

<h1 align="center">Basics Workspace</h1>

<p align="center">
  Company OS. Automations-first. Built for teams.
</p>

<p align="center">
  <a href="#getting-started">Getting Started</a> &middot;
  <a href="#architecture">Architecture</a> &middot;
  <a href="#apps">Apps</a> &middot;
  <a href="#automations-engine">Automations</a> &middot;
  <a href="#contributing">Contributing</a>
</p>

---

Basics Workspace is a company operating system where **automations are the core product**. Every app (CRM, Tasks, Notes, Meetings) is data context that makes automations smarter. Connections are fuel. The workspace is the cockpit.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Language | TypeScript, React 19 |
| Styling | Tailwind CSS v4, Framer Motion |
| Components | Radix UI, shadcn/ui |
| Database | PostgreSQL 16 + pgvector |
| ORM | Drizzle ORM |
| Auth | Better Auth |
| State | Zustand |
| Icons | Phosphor Icons |
| Testing | Vitest |

## Getting Started

### Quick Setup

```bash
git clone https://github.com/thebasicscompany/basicsWorkspace.git
cd basicsWorkspace
npm install
docker compose up -d
cp .env.example .env.local     # fill in values
npm run db:push
npx tsx scripts/seed.ts        # admin user + org + system objects
npx tsx scripts/seed-demo.ts   # CRM data + workflows
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Login: `admin@example.com` / `admin123`.

### Prerequisites

- **Node.js** 20+
- **Docker** (for PostgreSQL)
- **npm**

### Step-by-step

<details>
<summary>Expand for detailed setup instructions</summary>

#### 1. Clone & install

```bash
git clone https://github.com/thebasicscompany/basicsWorkspace.git
cd basicsWorkspace
npm install
```

#### 2. Start the database

```bash
docker compose up -d
```

This starts PostgreSQL 16 with pgvector on port **5435**.

#### 3. Configure environment

```bash
cp .env.example .env.local
```

Required variables:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5435/basics
BETTER_AUTH_SECRET=dev-secret-change-in-production
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
```

Optional (for LLM features):

```env
GATEWAY_URL=http://localhost:3002
GATEWAY_API_KEY=your-gateway-key
ENCRYPTION_KEY=          # openssl rand -hex 32
CRON_SECRET=             # secret for /api/cron endpoints
```

#### 4. Push schema & seed

```bash
npm run db:push
npx tsx scripts/seed.ts        # admin user, org, system objects
npx tsx scripts/seed-demo.ts   # 12 companies, 25 contacts, 12 deals, 10 tasks, 6 notes, 4 workflows
```

#### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Login: `admin@example.com` / `admin123`.

</details>

## Project Structure

```
app/                     Next.js routes (thin wrappers)
apps/                    Workspace apps (manifests, components, stores)
  _types.ts              AppManifest interface
  _registry.ts           Installed apps array
  automations/           Workflow canvas, block editor, stores
  crm/                   Contacts, companies, deals
  tasks/                 Task management
  notes/                 Notes
  ...
components/              Shell components (sidebar, header, launchpad)
lib/
  auth.ts                Better Auth server instance
  auth-client.ts         Client auth (signIn, signOut, useSession)
  db/                    Drizzle ORM setup + schema
  sim/                   Automations engine (executor, blocks, triggers)
    blocks/              180+ block definitions
    executor/            DAG executor
    providers/           LLM gateway integration
    serializer/          Workflow serializer
    tools/               190+ tool implementations
    triggers/            190+ trigger definitions
  webhooks/              Webhook processor + signature verification
  workflows/             Deployment persistence, schedules
  schedules/             Cron schedule worker
scripts/
  seed.ts                Database seeder
  test-deploy.ts         Deploy & trigger runtime tests
```

## Apps

The workspace uses a **data-driven app primitive**. Every app follows the same pattern:

```
apps/{slug}/
  manifest.ts            App metadata (name, icon, routes)
  components/            App-specific UI
  schema.ts              Drizzle schema (optional)
```

Apps are registered in `apps/_registry.ts`. The launchpad renders tiles from this registry.

| App | Description |
|-----|-------------|
| **Automations** | Visual workflow builder with 180+ blocks, DAG executor, copilot |
| **CRM** | Contacts, companies, deals with full CRUD |
| **Tasks** | Task management |
| **Notes** | Documents and notes |
| **Meetings** | Meeting management |
| **Context** | Cross-app data layer (records, objects, events) |
| **Shop** | OAuth connection marketplace (15+ providers) |
| **Settings** | Profile, workspace, secrets, gateway config |

## Automations Engine

The automations system is a visual workflow builder with a DAG execution engine, ported from [Sim](https://github.com/simstudioai/sim).

### Key Features

- **180+ blocks** — LLM agents, API calls, code execution, conditions, routers, loops
- **DAG executor** — parallel execution, conditional branching, loop/parallel containers
- **190+ triggers** — webhooks, schedules, service-specific events
- **Deploy system** — snapshot versioning, webhook registration, cron schedules
- **Copilot** — AI-powered workflow builder with 7 tools
- **Gateway integration** — all LLM calls route through a configurable gateway

### Running Workflows

Workflows can be triggered three ways:

1. **Manual** — Run button in the canvas UI
2. **Webhook** — `POST /api/webhooks/trigger/{path}` (public, signature-verified)
3. **Schedule** — Cron-based, checked via `GET /api/cron/schedules`

### Webhook Security

All provider webhooks are signature-verified using HMAC. Supported providers: GitHub, Linear, Attio, Jira, Confluence, Stripe, Slack, Twilio, Typeform, Cal.com, Fireflies, Ashby, Circleback, Microsoft Teams, and generic Bearer token auth.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type checking |
| `npm run db:push` | Push schema changes to DB |
| `npm run db:studio` | Open Drizzle Studio (DB explorer) |
| `npm run db:seed` | Seed database |

## Auth & Route Guard

Authentication uses [Better Auth](https://www.better-auth.com/) with email/password. The proxy (`proxy.ts`) checks for session cookies and redirects unauthenticated users to `/login`.

Public paths (no auth required):
- `/login`
- `/api/auth`
- `/api/webhooks`
- `/api/cron`
- `/api/function`
- `/api/tools`

## Database

PostgreSQL 16 with pgvector, managed by Drizzle ORM. Docker Compose runs on port **5435** to avoid conflicts.

Explore the schema interactively:

```bash
npm run db:studio
```

## Contributing

1. Create a branch from `main`
2. Make changes
3. Run `npm run build` to verify
4. Open a PR

## License

Proprietary. All rights reserved.
