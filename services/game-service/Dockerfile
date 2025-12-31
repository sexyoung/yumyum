# Game Service Dockerfile for Railway deployment
FROM node:24-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files for workspace resolution
COPY package.json package-lock.json* ./
COPY services/game-service/package.json ./services/game-service/
COPY shared/types/package.json ./shared/types/

# Install dependencies
RUN npm ci

# Build the application
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/services/game-service/node_modules ./services/game-service/node_modules
COPY --from=deps /app/shared/types/node_modules ./shared/types/node_modules

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build game-service
WORKDIR /app/services/game-service
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built application
COPY --from=builder /app/services/game-service/dist ./dist
COPY --from=builder /app/services/game-service/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Expose port
EXPOSE 3002

# Start the application
CMD ["node", "dist/index.js"]
