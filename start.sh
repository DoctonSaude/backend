#!/bin/sh
echo '--- ENVIRONMENT CHECK ---'
echo NODE_ENV: $NODE_ENV
echo PORT: $PORT

echo '--- RUNNING PRISMA MIGRATIONS ---'
npx prisma db push --accept-data-loss || true

echo '--- STARTING SERVER ---'
node dist/server.js
