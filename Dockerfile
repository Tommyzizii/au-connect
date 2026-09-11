# ─── Stage 1: deps ───────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./
# --ignore-scripts skips the postinstall prisma generate
RUN pnpm install --frozen-lockfile --ignore-scripts

# ─── Stage 2: builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Now generate and build with real-ish env (placeholders, only needed at build time)
RUN DATABASE_URL="mongodb://placeholder" pnpm prisma generate
RUN DATABASE_URL="mongodb://placeholder" \
    GOOGLE_CLIENT_ID="placeholder" \
    GOOGLE_CLIENT_SECRET="placeholder" \
    LINKEDIN_CLIENT_ID="placeholder" \
    LINKEDIN_CLIENT_SECRET="placeholder" \
    MICROSOFT_CLIENT_ID="placeholder" \
    MICROSOFT_CLIENT_SECRET="placeholder" \
    AZURE_STORAGE_ACCOUNT_KEY="placeholder" \
    AZURE_STORAGE_ACCOUNT_NAME="placeholder" \
    AZURE_STORAGE_CONNECTION_STRING="placeholder" \
    AZURE_STORAGE_CONTAINER_NAME="placeholder" \
    NEXT_PUBLIC_BASE_URL="http://localhost:3000" \
    JWT_SECRET="placeholder" \
    pnpm build

# ─── Stage 3: runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/lib/generated ./lib/generated
COPY --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
