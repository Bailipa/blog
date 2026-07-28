// Idempotent schema migration. Runs on server start via entrypoint.sh.
// We use the custom generated-client path (../src/generated/prisma/client.js)
// because deploy.sh copies that whole directory into the deploy artifact,
// and it gets refreshed by `npx prisma generate` before every build.

import { PrismaClient } from '../src/generated/prisma/client.js'

const prisma = new PrismaClient()

// CREATE TABLE IF NOT EXISTS for new tables
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

async function tableInfo(table) {
  return prisma.$queryRawUnsafe(`PRAGMA table_info("${table}")`)
}

async function main() {
  // Step 1: CREATE TABLE IF NOT EXISTS for new tables
  for (const sql of STATEMENTS) {
    await prisma.$executeRawUnsafe(sql)
  }

  // Step 2: ALTER TABLE / rebuild for schema changes on existing tables.
  //
  // SQLite limitations we work around here:
  // - ALTER TABLE ADD COLUMN works fine (used below for User.email)
  // - ALTER TABLE ALTER COLUMN (drop NOT NULL) is NOT supported, so making
  //   User.password nullable requires a full table rebuild.
  // - All inside one transaction so a mid-flight error rolls back cleanly.

  const userCols = await tableInfo('User')
  const hasEmail = userCols.some((c) => c.name === 'email')
  const passwordInfo = userCols.find((c) => c.name === 'password')
  // PRAGMA returns BigInt; coerce so === 0 compares correctly.
  const passwordIsNullable = Number(passwordInfo?.notnull ?? 1) === 0

  if (!hasEmail || !passwordIsNullable) {
    await prisma.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe(`PRAGMA foreign_keys=OFF`)
        await tx.$executeRawUnsafe(`ALTER TABLE "User" RENAME TO "User__legacy"`)
        await tx.$executeRawUnsafe(`CREATE TABLE "User" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "username" TEXT NOT NULL,
          "password" TEXT,
          "email" TEXT,
          "isAdmin" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`)
        await tx.$executeRawUnsafe(
          `INSERT INTO "User" (id, username, password, email, "isAdmin", "createdAt")
           SELECT id, username, password, NULL, "isAdmin", "createdAt" FROM "User__legacy"`,
        )
        await tx.$executeRawUnsafe(`DROP TABLE "User__legacy"`)
        await tx.$executeRawUnsafe(`CREATE UNIQUE INDEX "User_username_key" ON "User"("username")`)
        await tx.$executeRawUnsafe(`CREATE UNIQUE INDEX "User_email_key" ON "User"("email")`)
        await tx.$executeRawUnsafe(`PRAGMA foreign_keys=ON`)
      },
      { timeout: 30000 },
    )
    console.log('[migrate] User table rebuilt (password nullable + email column)')
  }

  // Step 3: bootstrap the existing creator admin with an email so they can
  // receive magic links. Only runs if the user exists and currently has no
  // email — never overwrites a known one.
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