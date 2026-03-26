FROM node:18-alpine AS builder

WORKDIR /app

# Install ALL dependencies (including devDependencies needed for build)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# --- Production image ---
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Copy build output from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/instrumentation.ts ./

EXPOSE 3000

CMD ["npm", "start"]
