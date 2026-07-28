// Idempotent schema migration. Runs on server start via entrypoint.sh.
// We use the custom generated-client path (../src/generated/prisma/client.js)
// because deploy.sh copies that whole directory into the deploy artifact,
// and it gets refreshed by `npx prisma generate` before every build.

import { PrismaClient } from '../src/generated/prisma/client.js'

const prisma = new PrismaClient()

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'VISIBLE',
    "authorId" TEXT,
    "ipHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "Comment_postId_status_createdAt_idx" ON "Comment"("postId", "status", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "Comment_createdAt_idx" ON "Comment"("createdAt")`,
  `CREATE INDEX IF NOT EXISTS "Comment_ipHash_createdAt_idx" ON "Comment"("ipHash", "createdAt")`,
]

async function main() {
  for (const sql of STATEMENTS) {
    await prisma.$executeRawUnsafe(sql)
  }
  console.log('[migrate] schema sync complete')
}

main()
  .catch((e) => {
    console.error('[migrate] failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })