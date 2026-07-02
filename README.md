# BugPulse

> AI-powered bug triage that turns chaos into structured, actionable issues — in under 3 seconds.

[![GitHub](https://img.shields.io/badge/github-Ritinpaul%2FBug--Triage--Max-black?logo=github)](https://github.com/Ritinpaul/Bug-Triage-Max)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![React](https://img.shields.io/badge/react-19-61DAFB?logo=react)](https://react.dev)
[![Powered by Gemini](https://img.shields.io/badge/AI-Google%20Gemini-4285F4?logo=google)](https://ai.google.dev)

Slack rants, email complaints, and form submissions are automatically parsed, prioritized, assigned, and exported as structured GitHub Issues — while your team stays focused on shipping.

---

## Demo

**"wtf the login button is broken again"**

↓ BugPulse processes this in ~3 seconds and produces:

```
Title:        Login button unresponsive
Component:    auth
Severity:     P1
Priority:     87/100
Assignee:     @alice (auth specialist)
Reproduction: 1. Open login page  2. Enter credentials  3. Click "Login"
              4. Observe: button does nothing  5. Expected: redirect to dashboard
Similar bugs: #31 (Auth timeout on mobile), #22 (Session refresh crash)
GitHub:       Issue #48 created
```

---

## Architecture

### Pipeline

```
Slack / Email / Form / Sentry / GitHub Webhook
               ↓
     ┌─────────────────────┐
     │  Ingestion Layer     │
     │  Dedup · Normalize   │
     └─────────────────────┘
               ↓
     ┌─────────────────────┐
     │  Parser Agent        │  ← Gemini 2.5 Flash
     │  Intent · Component  │
     │  Severity · Score    │
     └─────────────────────┘
               ↓
     ┌─────────────────────┐
     │  Triage Agent        │  ← Gemini 2.5 Flash
     │  Similar Bugs        │
     │  Auto-Assignment     │
     └─────────────────────┘
               ↓
     ┌─────────────────────┐
     │  Reproduction Agent  │  ← Gemini 2.5 Flash
     │  Steps · Expected    │
     │  Actual · Error Logs │
     └─────────────────────┘
               ↓
     ┌─────────────────────┐
     │  Output              │
     │  GitHub Issue        │
     │  Dashboard · Alerts  │
     └─────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v3, shadcn/ui, Framer Motion, Recharts |
| **Backend** | Hono 4, tRPC 11, Drizzle ORM, PostgreSQL / SQLite |
| **AI Agents** | Google Gemini 2.5 Flash |
| **Auth** | JWT sessions, OAuth 2.0, bcryptjs |
| **Real-time** | Server-Sent Events (SSE) |
| **Integrations** | GitHub API, Slack Events API, IMAP Email, Sentry Webhooks |
| **Observability** | Lemma SDK (agent activity log, dual-write datastore) |

---

## Features

- **Multi-Channel Ingestion** — Slack, Email (IMAP), Form, Sentry, and GitHub webhooks unified into a single normalized schema
- **3-Agent AI Pipeline** — Parser → Triage → Reproduction running on Gemini 2.5 Flash
- **Smart Deduplication** — Prevent duplicate bug reports using semantic similarity matching
- **Priority Scoring** — Every bug gets a 0–100 priority score combining severity, frequency, and component criticality
- **Auto-Assignment** — Routes bugs to the right team member based on expertise tags and on-call status
- **GitHub Issue Sync** — Structured issues auto-created in your repository with full reproduction context
- **Real-Time Dashboard** — Live bug stream, agent activity feed, and system health via SSE
- **CSV Export** — Export all bug data for external reporting from the Issues page
- **Analytics** — Severity distribution, component breakdown, resolution time, and agent performance metrics
- **Dark Mode** — Full dark/light theme support

### Ecosystem

| Package | Description |
|---------|-------------|
| [`bugpulse-cli`](packages/bugpulse-cli) | Terminal CLI — list, filter, assign, and report bugs from your shell |
| [`bugpulse-mcp`](packages/bugpulse-mcp) | MCP server — connect BugPulse to Claude, Cursor, and any MCP-compatible AI assistant |

---

## Quick Start

### Prerequisites

- Node.js ≥ 20
- A PostgreSQL or SQLite database
- Google Gemini API key ([get one free](https://aistudio.google.com/app/apikey))

### 1. Clone & Install

```bash
git clone https://github.com/Ritinpaul/Bug-Triage-Max.git
cd Bug-Triage-Max/app
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your keys:

```env
# Required
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=a_long_random_secret_string
DATABASE_URL=your_database_connection_string

# Optional — for GitHub issue sync
GITHUB_PAT=your_github_personal_access_token
GITHUB_OWNER=your-username
GITHUB_REPO=your-repo-name

# Optional — for Slack ingestion
SLACK_BOT_TOKEN=xoxb-...

# Optional — for Email ingestion
EMAIL_IMAP_HOST=imap.example.com
EMAIL_IMAP_USER=bugs@example.com
EMAIL_IMAP_PASS=your_password
```

### 3. Set Up the Database

```bash
npm run db:push      # Push schema to your database
npx tsx db/seed.ts   # Seed with demo data (optional)
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Log in with the seeded credentials or create an account.

---

## Webhook Endpoints

BugPulse exposes HTTP endpoints for external integrations. No authentication is required for webhook ingestion.

| Endpoint | Description |
|----------|-------------|
| `POST /api/webhooks/slack` | Slack Events API |
| `POST /api/webhooks/form` | Direct form submission |
| `POST /api/webhooks/sentry` | Sentry issue alerts |
| `POST /api/webhooks/github` | GitHub issue opened events |
| `GET /api/webhooks/health` | Integration health check |
| `GET /api/export/bugs.csv` | Export all bugs as CSV (auth required) |

### Example — submit a bug via `curl`

```bash
curl -X POST http://localhost:3000/api/webhooks/form \
  -H "Content-Type: application/json" \
  -d '{"text": "Payment page crashes on submit", "sender": "john@example.com"}'
```

---

## Project Structure

```
app/
├── server/                   # Backend (Hono + tRPC)
│   ├── boot.ts               # Server entry point, HTTP routes
│   ├── context.ts            # tRPC request context
│   ├── middleware.ts         # Auth & rate limiting
│   ├── router.ts             # Main tRPC router
│   ├── routers/              # Feature routers
│   │   ├── bugs.ts
│   │   ├── messages.ts
│   │   ├── agents.ts
│   │   ├── analytics.ts
│   │   ├── team.ts
│   │   └── integrations.ts
│   └── services/             # Business logic
│       ├── agent-service.ts  # AI agent orchestration
│       ├── gemini-service.ts # Gemini API client
│       ├── github-service.ts # GitHub API client
│       └── webhook-handlers.ts
├── db/
│   ├── schema.ts             # Drizzle schema
│   └── seed.ts               # Demo data seed
├── src/                      # Frontend (React 19)
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Issues.tsx
│   │   ├── BugDetail.tsx
│   │   ├── Analytics.tsx
│   │   └── Settings.tsx
│   ├── components/
│   ├── hooks/
│   └── providers/
└── packages/
    ├── bugpulse-cli/         # Terminal CLI
    └── bugpulse-mcp/         # MCP server
```

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `users` | User accounts and auth |
| `team_members` | Engineers with expertise tags and on-call status |
| `messages` | Raw ingested messages from all channels |
| `parsed_results` | AI parser output per message |
| `bug_reports` | Structured, triaged bug reports |
| `similar_bug_matches` | Semantic similarity links between bugs |
| `reproduction_steps` | AI-generated reproduction instructions |
| `agent_activities` | Agent execution audit log |
| `integration_status` | External service health snapshots |

---

## tRPC API

| Router | Key Procedures |
|--------|---------------|
| `bugs.*` | `list`, `getById`, `updateStatus`, `assign`, `linkGithub`, `stats` |
| `messages.*` | `list`, `getById`, `create`, `stats`, `recent` |
| `agents.*` | `activities`, `stats`, `triggerProcess`, `health` |
| `analytics.*` | `overview`, `timeSeries`, `performance` |
| `team.*` | `list`, `getByHandle`, `create`, `update`, `delete` |
| `auth.*` | `me`, `login`, `logout` |

---

## Security

- JWT-based sessions with `jose` (HS256)
- Passwords hashed with `bcryptjs`
- Rate limiting on all webhook endpoints
- Input validation via Zod on every tRPC procedure
- CORS scoped to trusted origins

---

## CLI & MCP Integration

### BugPulse CLI

```bash
cd packages/bugpulse-cli
npm install && npm run build && npm link

bugpulse config --api-url http://localhost:3000
bugpulse list --status open --severity P0
bugpulse stats
bugpulse open
bugpulse watch --interval 5
```

Full documentation: [packages/bugpulse-cli](packages/bugpulse-cli/README.md)

### BugPulse MCP

Connect BugPulse to Claude Desktop or Cursor:

```json
{
  "mcpServers": {
    "bugpulse": {
      "command": "node",
      "args": ["/path/to/packages/bugpulse-mcp/dist/index.js"],
      "env": { "BUGPULSE_API_URL": "http://localhost:3000" }
    }
  }
}
```

Full documentation: [packages/bugpulse-mcp](packages/bugpulse-mcp/README.md)

---

## License

MIT — see [LICENSE](LICENSE)

---

## Acknowledgments

- [Google Gemini](https://ai.google.dev) — AI inference backbone
- [shadcn/ui](https://ui.shadcn.com) — Component library
- [Lemma SDK](https://github.com/lemma-work) — Agent observability
- [Hono](https://hono.dev) — Ultra-fast web framework
- [tRPC](https://trpc.io) — End-to-end type safety
