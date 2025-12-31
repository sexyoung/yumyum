# API Gateway Dockerfile for Railway deployment
FROM node:24-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files for workspace resolution
COPY package.json package-lock.json* ./
COPY services/api-gateway/package.json ./services/api-gateway/
COPY shared/types/package.json ./shared/types/

# Install dependencies
RUN npm ci

# Build the application
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage (npm workspaces 會把所有依賴放在 root node_modules)
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build api-gateway
WORKDIR /app/services/api-gateway
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built application
COPY --from=builder /app/services/api-gateway/dist ./dist
COPY --from=builder /app/services/api-gateway/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]
