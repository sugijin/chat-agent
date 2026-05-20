# --- Build stage ---
FROM node:20-slim AS builder

WORKDIR /app

# Skip Chromium download during build (not needed for tsc)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Runtime stage ---
FROM node:20-slim

# Install Chromium for puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-freefont-ttf \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# WhatsApp session persisted in a volume
VOLUME ["/app/session"]

CMD ["node", "dist/index.js"]
