#!/bin/bash
set -euo pipefail

echo "=== LB Blog Deployment Script ==="
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Clean old deploy artifacts before build (standalone copies project root)
rm -rf deploy lb-blog_deploy_*.tar.gz

echo "[1/3] Syncing database schema..."
npx prisma db push --skip-generate

echo ""
echo "[2/3] Building..."
npm run build

echo ""
echo "[3/3] Creating deployment package..."
DEPLOY_DIR="deploy"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

cp -r .next/standalone/. "$DEPLOY_DIR/"
cp -r .next/static "$DEPLOY_DIR/.next/static"
cp -r node_modules/@prisma "$DEPLOY_DIR/node_modules/@prisma"
cp -r node_modules/.prisma "$DEPLOY_DIR/node_modules/.prisma"

# Copy debian prisma engine binary (not included by NFT)
mkdir -p "$DEPLOY_DIR/src/generated/prisma"
cp src/generated/prisma/libquery_engine-debian-openssl-3.0.x.so.node "$DEPLOY_DIR/src/generated/prisma/"

# Remove unnecessary prisma sub-packages
rm -rf "$DEPLOY_DIR/node_modules/@prisma/engines"
rm -rf "$DEPLOY_DIR/node_modules/@prisma/fetch-engine"
rm -rf "$DEPLOY_DIR/node_modules/@prisma/get-platform"
rm -rf "$DEPLOY_DIR/node_modules/@prisma/config"
rm -rf "$DEPLOY_DIR/node_modules/@prisma/adapter-pg"
rm -rf "$DEPLOY_DIR/node_modules/@prisma/adapter-better-sqlite3"
rm -rf "$DEPLOY_DIR/node_modules/@prisma/driver-adapter-utils"

# Clean dev files
mv "$DEPLOY_DIR/prisma" "$DEPLOY_DIR/prisma-bundled"

cat > "$DEPLOY_DIR/.env.production" << 'ENVEOF'
NODE_ENV=production
PORT=3001
AUTH_TRUST_HOST=true
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="YUyzO697P06HEMIFzF9nhZKyfLDkwfSILS2lx6FAWZ8="
NEXTAUTH_URL="https://blog.dogeggcode.cyou"
NEXT_PUBLIC_APP_URL="https://blog.dogeggcode.cyou"
LOG_LEVEL=info
ENVEOF

rm -rf "$DEPLOY_DIR/src" # except the engine binary we just copied... actually we need to keep it

# We already copied the engine binary, but rm -rf src deletes it.
# So copy it AFTER cleanup.
mkdir -p "$DEPLOY_DIR/src/generated/prisma"
cp src/generated/prisma/libquery_engine-debian-openssl-3.0.x.so.node "$DEPLOY_DIR/src/generated/prisma/"

rm -f "$DEPLOY_DIR/tsconfig.json" "$DEPLOY_DIR/tsconfig.tsbuildinfo"
rm -f "$DEPLOY_DIR/next.config.ts" "$DEPLOY_DIR/postcss.config.mjs"
rm -f "$DEPLOY_DIR/components.json" "$DEPLOY_DIR/eslint.config.mjs"
rm -f "$DEPLOY_DIR/AGENTS.md" "$DEPLOY_DIR/CLAUDE.md"
rm -f "$DEPLOY_DIR/docker-compose.yml" "$DEPLOY_DIR/Dockerfile"
rm -f "$DEPLOY_DIR/README.md" "$DEPLOY_DIR/.env"
rm -f "$DEPLOY_DIR/deploy.sh"

# Remove WASM engines from runtime (not needed with query engine binary)
rm -f "$DEPLOY_DIR"/node_modules/@prisma/client/runtime/*.wasm-base64.*

echo ""
TARBALL="lb-blog_deploy_${TIMESTAMP}.tar.gz"
tar -czf "$TARBALL" -C "$(dirname "$DEPLOY_DIR")" "$(basename "$DEPLOY_DIR")"

echo ""
echo "=== Done! ==="
echo "Package: $SCRIPT_DIR/$TARBALL ($(ls -lh "$TARBALL" | awk '{print $5}'))"
echo ""
echo "Deploy:"
echo "  1. pm2 delete lb-blog; rm -rf /www/wwwroot/blog.dogeggcode.cyou/lb-blog"
echo "  2. Upload $TARBALL via Baota → extract → rename deploy/ to lb-blog/"
echo "  3. cd /www/wwwroot/blog.dogeggcode.cyou/lb-blog && pm2 start scripts/entrypoint.sh --name lb-blog"
