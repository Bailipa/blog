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
  // P3: magic-link auth
  `CREATE TABLE IF NOT EXISTS "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_token_key" ON "VerificationToken"("token")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token")`,
]

async function main() {
  for (const sql of STATEMENTS) {
    await prisma.$executeRawUnsafe(sql)
  }

  // P3 migration: bootstrap the existing creator admin with an email so they
  // can receive magic links. Reads CREATOR_EMAIL from env. Only runs if the
  // user exists and currently has no email — never overwrites a known one.
  const creatorEmail = process.env.CREATOR_EMAIL
  if (creatorEmail) {
    const creator = await prisma.user.findFirst({ where: { username: 'creator' } })
    if (creator && !creator.email) {
      await prisma.user.update({
        where: { id: creator.id },
        data: { email: creatorEmail },
      })
      console.log('[migrate] creator.email =', creatorEmail)
    }
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