# WhatsApp → Personal Agent Integration — Design Spec

**Date:** 2026-05-20
**Status:** Approved — ready for implementation
**Project context:** [Personal Assistant System](https://www.notion.so/Personal-Assistant-System-3625a401b13080d9bbaaf8fd667d9c76)

---

## Goal

Enable the WhatsApp bot (`chat-agent`) to route `!ask` commands through Jin's Personal Assistant System — so actions like adding calendar events, drafting emails, or creating tasks can be triggered directly from WhatsApp conversations, with everything logged in Notion.

---

## Architecture

Two services running on the same cloud server via Docker Compose, communicating over an internal Docker network:

```
WhatsApp Chat
     │
     │  !ask add these events to my calendar
     ▼
chat-agent  (existing WhatsApp bot)
     │
     │  POST /ask  { question, context, chatName }
     │  internal Docker network · API key auth
     ▼
personal-agent  (new service)
     │
     ├─► Write to Notion 📥 Inbox  (immediately on receipt)
     │
     ├─► Read 🧠 My Context  (personal profile + agent rules)
     │
     ├─► Claude API — classify request → Agent A / B / C
     │       Agent A (Secretary) — calendar, tasks, reminders, daily life
     │       Agent B (Finance)   — expenses, invoices, budget
     │       Agent C (Corporate) — work, business matters
     │
     ├─► Execute tools based on classification:
     │       Google Calendar API  (create / list / update events)
     │       Gmail API            (draft / send emails)
     │       Notion API           (create tasks in Task Master, notes)
     │
     ├─► Move Inbox item to Notion 📁 Logs  (with outcome + tools used)
     │
     │  { reply: "Done! Added 3 events to your calendar." }
     ▼
chat-agent → replies in WhatsApp chat
```

The `personal-agent` is **never exposed to the public internet directly** — only accessible from `chat-agent` via the internal Docker network, protected by a shared API key.

---

## Scope — Version 1

| Capability | Tool |
|---|---|
| Add / query calendar events | Google Calendar API |
| Draft / send emails | Gmail API |
| Log all requests | Notion 📥 Inbox → 📁 Logs |
| Read personal rules + profile | Notion 🧠 My Context |
| Create tasks | Notion ✅ Task Master |

---

## personal-agent Service

**Stack:** TypeScript + Node.js + Express (matches `chat-agent`)

### API

`POST /ask`
```
Request:  { question: string, context: string, chatName: string }
Response: { reply: string }
```

### Internal flow per request

1. Write an "in-progress" entry to Notion 📥 Inbox
2. Read 🧠 My Context (personal profile + agent-specific rules) — cached per process start to reduce API calls
3. Call Claude with:
   - System prompt defining all three agents (A/B/C) with roles from My Context
   - Tool definitions: `create_calendar_event`, `list_calendar_events`, `send_email`, `create_draft_email`, `create_notion_task`
   - The WhatsApp `context` + `question` as the user message
4. Run the Claude agentic loop until no more tool calls are returned (Claude may chain multiple tools)
5. Update the Inbox entry status to "done", then write a new entry to 📁 Logs with: outcome, tools used, agent classification, status

### Project structure

```
personal-agent/
├── src/
│   ├── index.ts              # Express server + auth middleware
│   ├── agentHandler.ts       # Claude agentic loop
│   ├── contextLoader.ts      # Reads + caches My Context from Notion
│   ├── tools/
│   │   ├── calendar.ts       # Google Calendar API
│   │   ├── gmail.ts          # Gmail API
│   │   └── notion.ts         # Notion task creation
│   └── notionLogger.ts       # Inbox write + Logs update
├── .env
├── .env.example
├── Dockerfile
├── package.json
└── tsconfig.json
```

### Changes to chat-agent

- Replace direct call to `claudeClient.ts` with a call to `personalAgentClient.ts`
- `personalAgentClient.ts` POSTs `{ question, context, chatName }` to the Personal Agent and returns the reply string
- Fallback: if the Personal Agent is unreachable, fall back to `claudeClient.ts` (answer only, no tools) and note "(personal agent offline)" in the reply

---

## Notion Integration

Uses the **existing databases** — no new databases created.

| Database | Usage |
|---|---|
| 📥 Inbox | Write on receipt; update with status when done |
| ✅ Task Master | Create tasks when the agent identifies a task |
| 🧠 My Context | Read personal profile + agent rules on startup |
| 📁 Logs | Final record of each completed request |

### Inbox / Logs entry fields

| Field | Value |
|---|---|
| Title | First 80 chars of the question |
| Source | `WhatsApp — {chatName}` |
| Agent | `A`, `B`, or `C` |
| Request | Full question text |
| Response | Agent reply |
| Tools Used | `calendar`, `gmail`, `notion` (multi-select) |
| Status | `success` / `error` |
| Date | Timestamp |

---

## Authentication & Credentials

### Google (Calendar + Gmail) — OAuth2

One-time local setup:
1. Create a Google Cloud project → enable Calendar API + Gmail API
2. Create OAuth2 credentials → download `credentials.json`
3. Run `npm run auth` (setup script included) → generates `token.json` with refresh token
4. Store client ID, client secret, and refresh token as env vars — never committed to git

The service uses the stored refresh token on every request; no re-authentication needed.

### Notion

Create a Notion Integration at developers.notion.com → get API token → share each database (Inbox, Task Master, My Context, Logs) with the integration.

### Environment variables

**personal-agent `.env`:**
```
ANTHROPIC_API_KEY=
PERSONAL_AGENT_API_KEY=        # shared secret with chat-agent
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GOOGLE_CALENDAR_ID=main         # 'main' for primary calendar
NOTION_TOKEN=
NOTION_INBOX_DB_ID=
NOTION_TASK_MASTER_DB_ID=
NOTION_CONTEXT_PAGE_ID=
NOTION_LOGS_DB_ID=
PORT=3001
```

**chat-agent `.env` additions:**
```
PERSONAL_AGENT_URL=http://personal-agent:3001
PERSONAL_AGENT_API_KEY=        # same shared secret
```

---

## Docker Compose

Both services in one `docker-compose.yml`. Docker Compose creates a default bridge network — services can reach each other by service name (`http://personal-agent:3001`). No extra network config needed.

```yaml
services:
  chat-agent:
    # existing service
    environment:
      - PERSONAL_AGENT_URL=http://personal-agent:3001
      - PERSONAL_AGENT_API_KEY=${PERSONAL_AGENT_API_KEY}

  personal-agent:
    build: ./personal-agent
    restart: unless-stopped
    env_file: ./personal-agent/.env
    # no ports: mapping — not reachable from outside Docker
```

`personal-agent` has no `ports` mapping — only reachable from within the Docker Compose network.

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Personal Agent unreachable | `chat-agent` falls back to direct Claude answer; reply includes "(personal agent offline)" |
| Tool call fails (e.g. Calendar API error) | Claude is told the tool failed; responds gracefully with manual fallback instructions |
| Claude returns no tool calls | Treated as a plain answer; logged to Notion normally |
| Notion logging fails | Log failure is swallowed silently — does not block the WhatsApp reply |

---

## Testing

A `scripts/test-request.ts` script in `personal-agent` sends a test payload directly without WhatsApp:

```bash
npm run test-request -- "add a meeting with James on Friday at 2pm"
```

Use this to verify Google Calendar and Gmail integrations work before connecting the bot end-to-end.

---

## Out of Scope (v1)

- Gemini integration (remains separate per the Personal Assistant System design)
- Telegram output channel
- Agent B (Finance) tool implementations — logged and classified, but tools TBD in v2
- Agent C (Corporate) tool implementations — same as B
- Proactive notifications from agent to WhatsApp
