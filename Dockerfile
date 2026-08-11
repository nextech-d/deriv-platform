# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_DEMO_MODE=true
ARG NEXT_PUBLIC_DERIV_APP_ID=000000
ENV NEXT_PUBLIC_DEMO_MODE=$NEXT_PUBLIC_DEMO_MODE
ENV NEXT_PUBLIC_DERIV_APP_ID=$NEXT_PUBLIC_DERIV_APP_ID
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/data ./data-seed

RUN mkdir -p /app/data && \
    cp /app/data-seed/payment-agents-partners.json /app/data/ && \
    cp /app/data-seed/copy-providers.json /app/data/ && \
    chown -R nextjs:nodejs /app/data

ENV PARTNER_AGENTS_DATA_PATH=/app/data/payment-agents-partners.json
ENV COPY_PROVIDERS_DATA_PATH=/app/data/copy-providers.json

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
