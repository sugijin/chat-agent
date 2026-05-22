# 🤖 Personal Chat Bot (WhatsApp)

A WhatsApp AI assistant powered by [Claude](https://anthropic.com). Type `!ask <question>` in any WhatsApp chat and the agent will read the recent conversation for context and reply instantly.

## How It Works

1. The bot connects to your personal WhatsApp via a QR code scan
2. You type `!ask <question>` in any chat (to anyone, or a group)
3. The bot reads the last 20 messages in that chat as context
4. Claude AI generates a helpful reply
5. The reply is sent back in the same chat, quoted to your message

## Requirements

- [Node.js](https://nodejs.org) v18 or later
- An [Anthropic API key](https://console.anthropic.com)

## Installation

```bash
# 1. Clone the repo
git clone https://github.com/sugijin/chat-agent.git
cd chat-agent

# 2. Install dependencies
npm install

# 3. Set up your API key
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# 4. Build
npm run build
```

## Running the Bot

```bash
npm start
```

On first run, a QR code will appear in the terminal:

1. Open **WhatsApp** on your phone
2. Go to **Settings → Linked Devices → Link a Device**
3. Scan the QR code

The session is saved automatically — you only need to scan once.

## Usage

In any WhatsApp chat, send:

```
!ask <your question>
```

**Examples:**
```
!ask what should I reply to this?
!ask summarise this conversation
!ask translate the last message to English
!ask is this a good deal?
```

The agent uses the recent messages in the chat as context to give a relevant answer.

## Project Structure

```
chat-agent/
├── src/
│   ├── index.ts          # WhatsApp client setup & event listeners
│   ├── messageHandler.ts # Handles !ask commands & builds context
│   └── claudeClient.ts   # Claude API integration
├── .env.example          # Environment variable template
├── Dockerfile            # For cloud/server deployment
├── docker-compose.yml    # Easy Docker deployment
├── package.json
└── tsconfig.json
```

## Cloud Deployment (Optional)

To run 24/7 on a server without keeping your Mac on:

```bash
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

docker compose up -d
docker logs -f chat-agent  # Scan QR code from logs
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |
| `CLAUDE_MODEL` | No | Claude model (default: `claude-opus-4-7`) |

## Tech Stack

- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) — WhatsApp Web API
- [@anthropic-ai/sdk](https://github.com/anthropics/anthropic-sdk-node) — Claude AI
- [TypeScript](https://www.typescriptlang.org) — Language
- [Puppeteer](https://pptr.dev) — Headless browser for WhatsApp Web

## Notes

- The bot only responds to messages **you** send (not other people in the chat)
- Keep the Terminal window open while using the bot locally
- Your API key in `.env` is excluded from git by `.gitignore`
- **Visibility**: Replies are sent as you from your WhatsApp account. The other party sees them as normal messages and cannot tell they were written by AI
