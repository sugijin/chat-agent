# 🤖 WhatsApp AI Assistant (powered by Claude)

A personal AI assistant that lives inside your WhatsApp. Type `!ask <question>` in any chat and it instantly replies with an AI-generated response — using the recent conversation as context.

Replies are sent **as you** from your own WhatsApp account. The other party cannot tell it was written by AI.

---

## User Guide

### How to use it

In any WhatsApp chat, type:

```
!ask <your question>
```

**Examples:**
```
!ask what should I reply to this?
!ask summarise this conversation
!ask translate the last message to English
!ask is this a good deal?
!ask write a polite way to say no
```

The bot reads the last 20 messages in the chat for context and replies in the same chat.

### Things to know

- The bot only triggers on messages **you** send starting with `!ask`
- It does not respond to other people's messages
- Replies appear as normal messages from your WhatsApp account
- The other party cannot tell the reply was written by AI

---

## Setup Guide

### What you need

- A computer running macOS, Linux, or Windows
- [Node.js](https://nodejs.org) v18 or later
- An [Anthropic API key](https://console.anthropic.com) (free to sign up, pay per use)
- A WhatsApp account

### Step 1 — Clone the repo

```bash
git clone https://github.com/sugijin/chat-agent.git
cd chat-agent
```

### Step 2 — Install dependencies

```bash
npm install
```

### Step 3 — Add your API key

```bash
cp .env.example .env
```

Open `.env` and fill in your Anthropic API key:

```
ANTHROPIC_API_KEY=your_key_here
```

### Step 4 — Build and run

```bash
npm run build
npm start
```

A QR code will appear in the terminal.

### Step 5 — Link your WhatsApp

1. Open **WhatsApp** on your phone
2. Go to **Settings → Linked Devices → Link a Device**
3. Scan the QR code shown in the terminal

The session is saved automatically — you only need to scan once. After that, just run `npm start` to restart the bot.

---

## Cloud Deployment (run 24/7)

To keep the bot running without leaving your computer on, deploy it to a cloud server using Docker.

### Requirements

- A server running Linux (e.g. a free-tier GCP or AWS VM)
- [Docker](https://docs.docker.com/get-docker/) installed

### Deploy

```bash
# 1. Clone the repo on your server
git clone https://github.com/sugijin/chat-agent.git
cd chat-agent

# 2. Add your API key
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# 3. Start
docker compose up -d --build

# 4. Watch the logs and scan the QR code
docker compose logs -f chat-agent
```

Scan the QR code that appears in the logs. The bot will then run 24/7 in the background.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |
| `CLAUDE_MODEL` | No | Claude model (default: `claude-opus-4-7`) |

---

## Tech Stack

- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) — WhatsApp Web automation
- [@anthropic-ai/sdk](https://github.com/anthropics/anthropic-sdk-node) — Claude AI
- [Puppeteer](https://pptr.dev) — Headless browser
- [TypeScript](https://www.typescriptlang.org) — Language
- [Docker](https://docker.com) — Cloud deployment
