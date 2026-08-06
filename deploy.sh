#!/bin/bash
set -euo pipefail

echo "=== LB Blog Deployment Script ==="
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Clean old deploy artifacts before build (standalone copies project root)
rm -rf deploy lb-blog_deploy_*.tar.gz

# Source .env.local if it exists so DirectMail / SMTP secrets make it into
# the generated .env.production. The .env.local file is gitignored and
# holds values the build host can't expose (e.g. AK secrets). Falls back
# silently if absent.
if [ -f .env.local ]; then
  set -a; . ./.env.local; set +a
fi

echo "[1/4] Generating Prisma client..."
npx prisma generate

echo ""
echo "[2/4] Syncing database schema..."
npx prisma db push --skip-generate

echo ""
echo "[3/4] Building..."
# NEXT_PUBLIC_* vars are inlined at build time. Force the public app URL so
# canonical / og:url / OG image metadata point at the real site instead of
# whatever localhost value is in .env during the local build.
export NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-https://blog.dogeggcode.cyou}"
npm run build

echo ""
echo "[4/4] Creating deployment package..."
DEPLOY_DIR="deploy"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

cp -r .next/standalone/. "$DEPLOY_DIR/"
cp -r .next/static "$DEPLOY_DIR/.next/static"
cp -r node_modules/@prisma "$DEPLOY_DIR/node_modules/@prisma"
cp -r node_modules/.prisma "$DEPLOY_DIR/node_modules/.prisma"
# bcryptjs is used by /admin/login + /api/admin/password for admin password
# auth. Next.js standalone doesn't auto-trace dynamic imports of it, so we
# have to copy it explicitly. Without this, admin login throws
# "Cannot find package 'bcryptjs'" at runtime (visible as CredentialsSignin).
cp -r node_modules/bcryptjs "$DEPLOY_DIR/node_modules/bcryptjs"
mkdir -p "$DEPLOY_DIR/scripts"
cp -r scripts/. "$DEPLOY_DIR/scripts"

# Copy Prisma generated client + debian engine binary.
# Whole directory (not just the .so.node) so scripts like migrate-db.js can
# require the JS entrypoint on the server.
rm -rf "$DEPLOY_DIR/src"
mkdir -p "$DEPLOY_DIR/src/generated"
cp -r src/generated/prisma "$DEPLOY_DIR/src/generated/prisma"

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

cat > "$DEPLOY_DIR/.env.production" <<ENVEOF
NODE_ENV=production
PORT=3001
AUTH_TRUST_HOST=true
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="YUyzO697P06HEMIFzF9nhZKyfLDkwfSILS2lx6FAWZ8="
NEXTAUTH_URL="https://blog.dogeggcode.cyou"
NEXT_PUBLIC_APP_URL="https://blog.dogeggcode.cyou"
LOG_LEVEL=info

# OTP email (visitor login). DirectMail creds are optional — when unset,
# the OTP code falls through to /tmp/otp-debug.log on the server and the
# /login page shows it inline.
DIRECT_MAIL_ACCESS_KEY_ID="${DIRECT_MAIL_ACCESS_KEY_ID:-}"
DIRECT_MAIL_ACCESS_KEY_SECRET="${DIRECT_MAIL_ACCESS_KEY_SECRET:-}"
DIRECT_MAIL_FROM="${DIRECT_MAIL_FROM:-}"
DIRECT_MAIL_FROM_NAME="${DIRECT_MAIL_FROM_NAME:-LB Blog}"
DIRECT_MAIL_REGION="${DIRECT_MAIL_REGION:-cn-hangzhou}"

# Admin login is username + password at /admin/login. Bootstrap by
# running on the server after first deploy:
#   cd /www/wwwroot/blog.dogeggcode.cyou/lb-blog
#   node scripts/set-admin-password.js creator
# (it prints a one-time random password if you don't pass one as argv).
ENVEOF

rm -f "$DEPLOY_DIR/tsconfig.json" "$DEPLOY_DIR/tsconfig.tsbuildinfo"
rm -f "$DEPLOY_DIR/next.config.ts" "$DEPLOY_DIR/postcss.config.mjs"
rm -f "$DEPLOY_DIR/components.json" "$DEPLOY_DIR/eslint.config.mjs"
rm -f "$DEPLOY_DIR/AGENTS.md" "$DEPLOY_DIR/CLAUDE.md"
rm -f "$DEPLOY_DIR/docker-compose.yml" "$DEPLOY_DIR/Dockerfile"
rm -f "$DEPLOY_DIR/README.md" "$DEPLOY_DIR/.env"
rm -f "$DEPLOY_DIR/deploy.sh"

# Remove WASM engines from runtime (not needed with query engine binary)
rm -f "$DEPLOY_DIR"/node_modules/@prisma/client/runtime/*.wasm-base64.*

# CRITICAL: strip live state from the bundle so it can never overwrite prod
# - prisma-bundled/dev.db: this is the local seed DB at build time; if it lands
#   on the server and entrypoint sees a missing prisma/dev.db, it would silently
#   reseed the live DB and wipe user content (posts, mumbles, etc).
# - public/uploads/: user-uploaded images that must be preserved across deploys.
rm -f "$DEPLOY_DIR/prisma-bundled/dev.db" "$DEPLOY_DIR/prisma-bundled/dev.db-journal"
rm -f "$DEPLOY_DIR"/prisma-bundled/dev.db.* 2>/dev/null || true
rm -rf "$DEPLOY_DIR/public/uploads"

echo ""
TARBALL="lb-blog_deploy_${TIMESTAMP}.tar.gz"
tar -czf "$TARBALL" -C "$(dirname "$DEPLOY_DIR")" "$(basename "$DEPLOY_DIR")"

echo ""
echo "=== Done! ==="
echo "Package: $SCRIPT_DIR/$TARBALL ($(ls -lh "$TARBALL" | awk '{print $5}'))"
echo ""
echo "Deploy (data-preserving):"
echo "  1. ssh root@114.55.58.90 'pm2 stop lb-blog'"
echo "  2. Upload $TARBALL via Baota → extract INTO the existing lb-blog/ dir"
echo "     (do NOT rm -rf; tar -xf on top of existing files is fine and preserves uploads)"
echo "  3. ssh root@114.55.58.90 'cd /www/wwwroot/blog.dogeggcode.cyou/lb-blog'"
echo "             'pm2 delete lb-blog   # only to refresh env vars'"
echo "             'pm2 start scripts/entrypoint.sh --name lb-blog'"
echo "  4. Verify Post count unchanged:"
echo "     ssh root@114.55.58.90 'sqlite3 /www/wwwroot/blog.dogeggcode.cyou/lb-blog/prisma/dev.db \"SELECT COUNT(*) FROM Post;\"'"
echo ""
echo "First-time install (no existing data):"
echo "  1. Extract to a fresh /www/wwwroot/blog.dogeggcode.cyou/lb-blog/"
echo "  2. cd lb-blog && pm2 start scripts/entrypoint.sh --name lb-blog"
echo "  3. entrypoint will seed prisma/dev.db from prisma-bundled/dev.db (which"
echo "     was stripped above — so this requires manually providing a seed DB."
echo "     For dev environments, run \`npx prisma db seed\` locally and scp the"
echo "     resulting prisma/dev.db into prisma-bundled/ before re-running deploy.sh)."
