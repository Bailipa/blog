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
  echo ""
  echo "==============================================================="
  echo " WARNING: prisma/dev.db is missing."
  echo " This entrypoint WILL NOT auto-create one from the bundled seed."
  echo " If this is a fresh install, copy a seed DB manually:"
  echo "   scp path/to/dev.db /www/wwwroot/blog.dogeggcode.cyou/lb-blog/prisma/dev.db"
  echo " Or, for dev only:"
  echo "   cd \$APP_DIR && npx prisma db push --skip-generate && npm run seed"
  echo " Refusing to start with an empty database to protect live data."
  echo "==============================================================="
  exit 1
fi

echo "Syncing schema (idempotent)..."
node scripts/migrate-db.js

echo "Starting server..."
exec node server.js
