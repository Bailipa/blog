#!/bin/sh
set -e

if [ ! -f prisma/schema.prisma ]; then
  cp prisma-bundled/schema.prisma prisma/schema.prisma
  cp prisma-bundled/seed.ts prisma/seed.ts 2>/dev/null || true
fi

if [ ! -f prisma/dev.db ]; then
  echo "First launch: copying bundled database..."
  cp prisma-bundled/dev.db prisma/dev.db
fi

echo "Syncing database schema..."
npx prisma db push --skip-generate

echo "Starting server..."
exec node server.js
