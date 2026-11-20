# Production Dockerfile for Coaching Institute OS
FROM oven/bun:1 AS builder

WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy application source code
COPY . .

# Generate Prisma client and build client bundle
RUN bun run db:generate
RUN bun run build

# Production runner image
FROM oven/bun:1-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy build outputs and required application files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/server ./server
COPY --from=builder /app/server.tsx ./
COPY --from=builder /app/custom-routes.ts ./
COPY --from=builder /app/src ./src

EXPOSE 3001

# Start the unified Hono + Vite static server
CMD ["bun", "run", "server.tsx"]
