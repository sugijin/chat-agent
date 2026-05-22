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

# Install only the system libs Chrome needs to run (not Chrome itself)
# Chrome binary is downloaded by puppeteer during npm ci
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-freefont-ttf \
    libglib2.0-0 \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libxkbcommon0 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libxtst6 \
    libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# WhatsApp session persisted in a volume
VOLUME ["/app/session"]

CMD ["node", "dist/index.js"]
