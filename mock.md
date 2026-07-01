# Bug Triage Max - Mock / Integration Guide

This document lists all external services, API keys, and real data integrations that need to be configured for production use.

---

## External API Keys Required

### 1. GitHub Personal Access Token (PAT)
**Purpose:** Create issues, link bug reports to GitHub  
**File:** `.env` or environment variable  
**Key:** `GITHUB_PAT`  
**How to get:**
1. Go to GitHub Settings → Developer Settings → Personal Access Tokens
2. Generate new token with `repo` scope
3. Copy token to `.env`

```env
GITHUB_PAT=ghp_xxxxxxxxxxxxxxxxxxxx
```

**Code location:** `api/services/github-service.ts` (to be created)  
**Integration point:** `bugReports.githubIssueId`, `bugReports.githubIssueUrl`

---

### 2. Slack Bot Token
**Purpose:** Receive Slack messages via Events API, post notifications  
**File:** `.env`  
**Key:** `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`  
**How to get:**
1. Create a Slack App at https://api.slack.com/apps
2. Enable Event Subscriptions (request URL: `https://your-domain/api/webhooks/slack`)
3. Subscribe to bot events: `message.channels`, `message.im`
4. Install app to workspace, copy Bot User OAuth Token

```env
SLACK_BOT_TOKEN=xoxb-xxxxxxxxxxxx-xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx
SLACK_SIGNING_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Code location:** `api/services/slack-service.ts` (to be created)  
**Webhook endpoint:** `POST /api/webhooks/slack`

---

### 3. Email (IMAP) Credentials
**Purpose:** Poll email inbox for bug reports  
**File:** `.env`  
**Key:** `EMAIL_IMAP_HOST`, `EMAIL_IMAP_USER`, `EMAIL_IMAP_PASSWORD`  
**How to get:** Use your organization's IMAP server or a dedicated email account

```env
EMAIL_IMAP_HOST=imap.gmail.com
EMAIL_IMAP_PORT=993
EMAIL_IMAP_USER=bugs@yourcompany.com
EMAIL_IMAP_PASSWORD=your-app-specific-password
```

**Code location:** `api/services/email-service.ts` (to be created)  
**Note:** For Gmail, use App Passwords (not your main password)

---

### 4. Lemma SDK API Key
**Purpose:** Run AI agents on the Lemma platform  
**File:** `.env`  
**Key:** `LEMMA_API_KEY`, `LEMMA_BASE_URL`  
**How to get:**
1. Sign up at https://lemma.work
2. Create a pod
3. Generate an API key from pod settings
4. Install the Lemma Python SDK: `pip install lemma-sdk`

```env
LEMMA_API_KEY=lemma_xxxxxxxxxxxxxxxxxxxx
LEMMA_BASE_URL=https://api.lemma.work
```

**Code location:** `api/services/agent-service.ts` (currently simulated)  
**SDK Docs:** https://github.com/lemma-work/lemma-platform/tree/main/lemma-python

**Integration pattern:**
```python
from lemma_sdk import Lemma, Pod

lemma = Lemma(api_key="your-key")
pod = lemma.pod("your-pod-slug")

# Run a workflow
result = pod.workflow("parse-bug").run({
    "message": raw_content
})
```

---

### 5. LLM Provider (OpenRouter / Anthropic / OpenAI)
**Purpose:** Power the Parser, Triage, and Reproduction agents  
**File:** `.env`  
**Key:** `LLM_API_KEY`, `LLM_MODEL`  
**How to get:**
1. Sign up at https://openrouter.ai (recommended - access to multiple models)
2. Generate an API key
3. Choose a model: `anthropic/claude-sonnet-4`, `openai/gpt-4o`, etc.

```env
LLM_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxx
LLM_MODEL=anthropic/claude-sonnet-4
LLM_BASE_URL=https://openrouter.ai/api/v1
```

**Code location:** `api/services/llm-service.ts` (to be created)  
**Current:** Agents use pattern matching (no LLM calls)  
**Production:** Replace with real LLM API calls

---

## Webhook Endpoints

Configure these URLs in your external services:

| Service | Endpoint | Method |
|---------|----------|--------|
| Slack Events | `https://your-domain/api/webhooks/slack` | POST |
| Typeform / Google Forms | `https://your-domain/api/webhooks/form` | POST |
| GitHub Webhooks (optional) | `https://your-domain/api/webhooks/github` | POST |

---

## Database

**Current:** MySQL via Drizzle ORM  
**Config:** `DATABASE_URL` in `.env` (auto-configured by init script)  
**Production considerations:**
- Use a managed MySQL service (AWS RDS, PlanetScale, etc.)
- Enable connection pooling (PgBouncer / ProxySQL)
- Set up automated backups

---

## Vector Search (for Similar Bug Detection)

**Current:** Keyword matching on component + keywords  
**Production:** Use a vector database for semantic similarity

**Options:**
1. **Pinecone** - Managed vector DB
2. **Weaviate** - Open-source vector search
3. **pgvector** - PostgreSQL extension (if migrating to Postgres)

**Setup:**
```env
PINECONE_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
PINECONE_INDEX=bug-triage-similarity
```

**Embedding model:** `sentence-transformers/all-MiniLM-L6-v2`  
**Code location:** `api/services/vector-service.ts` (to be created)

---

## What Is Currently Mocked

| Feature | Current | Production |
|---------|---------|------------|
| Parser Agent | Pattern matching | LLM-powered with few-shot |
| Triage Agent | Keyword similarity | Vector semantic search |
| Reproduction Agent | Template generation | LLM with error log analysis |
| GitHub Integration | Manual issue body copy | Auto-create via GitHub API |
| Slack Integration | Simulated | Real Slack Events API |
| Email Integration | Simulated | Real IMAP polling |
| Release Note Agent | Not implemented | GitHub releases API |

---

## Environment Variables Summary

```env
# Database (auto-configured)
DATABASE_URL=mysql://user:pass@host:3306/db

# GitHub
GITHUB_PAT=ghp_xxx
GITHUB_REPO_OWNER=your-org
GITHUB_REPO_NAME=your-repo

# Slack
SLACK_BOT_TOKEN=xoxb-xxx
SLACK_SIGNING_SECRET=xxx

# Email
EMAIL_IMAP_HOST=imap.gmail.com
EMAIL_IMAP_PORT=993
EMAIL_IMAP_USER=bugs@company.com
EMAIL_IMAP_PASSWORD=xxx

# Lemma
LEMMA_API_KEY=lemma_xxx
LEMMA_BASE_URL=https://api.lemma.work

# LLM
LLM_API_KEY=sk-or-v1-xxx
LLM_MODEL=anthropic/claude-sonnet-4
LLM_BASE_URL=https://openrouter.ai/api/v1

# Vector DB (optional)
PINECONE_API_KEY=xxx
PINECONE_INDEX=bug-triage-similarity
```
