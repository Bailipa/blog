#!/bin/sh
set -e

cd "$(dirname "$0")/.."

export PORT=3001
set -a; . ./.env.production; set +a

mkdir -p prisma

if [ ! -f prisma/schema.prisma ]; then
  cp prisma-bundled/schema.prisma prisma/schema.prisma
  cp prisma-bundled/seed.ts prisma/seed.ts 2>/dev/null || true
fi

if [ ! -f prisma/dev.db ]; then
  echo "First launch: copying bundled database..."
  cp prisma-bundled/dev.db prisma/dev.db
fi

echo "Starting server..."
exec node server.js
