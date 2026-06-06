#!/bin/sh
set -e

echo '🚀 [BOOT] DOCTON HYBRID ARCHITECTURE - OPTIMIZED BOOT'
echo "NODE_ENV: $NODE_ENV"
echo "PUBLIC_PORT: $PORT"

# 1. Inicia o Monolito em Segundo Plano (Porta 3006)
# Ele deve ser um dos primeiros a subir para estar pronto quando o Gateway repassar tráfego
echo '--- 🦖 STARTING MONOLITH (Internal: 3006) ---'
PORT=3006 node dist/server.js &

# 2. Inicia o Gateway IMEDIATAMENTE (Porta Pública: '$PORT')
# Isso garante que a Railway detecte a porta aberta nos primeiros segundos
echo "--- 🛡️ STARTING GATEWAY (Public: $PORT) ---"
node dist/gateway/api-gateway.js &

# 3. Executa as migrações em paralelo
# Usamos '--accept-data-loss' para garantir agilidade em dev/staging, mas idealmente seria migrate deploy
echo '--- 🗄️ BACKGROUND: RUNNING PRISMA MIGRATIONS ---'
npx prisma db push --accept-data-loss &

# 4. Mantém o script vivo e monitorando os processos
echo '--- ⏳ SYSTEM INITIALIZED - MONITORING PROCESSES ---'
# Removemos o '-n' para que ele não saia assim que o primeiro processo (migrações) termine
wait
