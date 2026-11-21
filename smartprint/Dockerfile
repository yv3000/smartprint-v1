# Multi-stage production Dockerfile for Google Cloud Run
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV CLOUD_RUN_BUILD=true
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

EXPOSE 8080
CMD ["node", "server.js"]
