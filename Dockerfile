FROM node:20-slim AS base

# Install openssl for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package*.json ./
COPY prisma ./prisma/

# We use npm ci for faster, more reliable builds if package-lock.json exists.
# If it doesn't, we fallback to npm install.
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Generate Prisma Client
RUN npx prisma generate

# Copy the rest of the source code
COPY . .

# Build the application
RUN npm run build

# Production image
FROM node:20-slim AS runner

# Install openssl for Prisma in the runner stage too
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/lib ./lib
COPY --from=base /app/locales ./locales
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

EXPOSE 3001

CMD ["sh", "./start.sh"]
