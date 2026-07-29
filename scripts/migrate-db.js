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

async function indexInfo(table) {
  return prisma.$queryRawUnsafe(`PRAGMA index_list("${table}")`)
}

async function addColumnIfMissing(table, colName, colDef) {
  const cols = await tableInfo(table)
  if (cols.some((c) => c.name === colName)) return false
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN "${colName}" ${colDef}`)
  return true
}

async function addIndexIfMissing(indexName, table, cols) {
  const indices = await indexInfo(table)
  if (indices.some((i) => i.name === indexName)) return false
  const colList = cols.map((c) => `"${c}"`).join(', ')
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "${indexName}" ON "${table}"(${colList})`,
  )
  return true
}

async function main() {
  // Step 1: CREATE TABLE IF NOT EXISTS for new tables
  for (const sql of STATEMENTS) {
    await prisma.$executeRawUnsafe(sql)
  }

  // Step 2a: Detect if Comment table's authorId FK still points to the
  // dropped User__legacy table. This happens when a previous deploy ran
  // the User table rebuild but didn't rebuild Comment alongside it —
  // SQLite's ALTER TABLE RENAME doesn't rewrite FK references in OTHER
  // tables, so the FK silently retargets to User__legacy and breaks all
  // future INSERTs into Comment.
  //
  // We use raw sqlite_master query instead of PRAGMA foreign_key_list
  // because Prisma's serializer chokes on BigInt columns from the pragma.
  let commentNeedsRebuild = false
  try {
    const fkRow = await prisma.$queryRawUnsafe(
      `SELECT sql FROM sqlite_master WHERE type='table' AND name='Comment'`,
    )
    const sql = fkRow[0]?.sql ?? ''
    // Look for any REFERENCES clause pointing to User__legacy
    if (/REFERENCES\s+"User__legacy"/i.test(sql)) {
      commentNeedsRebuild = true
      console.log('[migrate] Comment FK → User__legacy detected. Will rebuild Comment.')
    }
  } catch (e) {
    console.warn('[migrate] Comment FK check failed:', e)
  }

  if (commentNeedsRebuild) {
    await prisma.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe(`PRAGMA foreign_keys=OFF`)
        await tx.$executeRawUnsafe(`ALTER TABLE "Comment" RENAME TO "Comment__legacy"`)
        await tx.$executeRawUnsafe(`CREATE TABLE "Comment" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "postId" TEXT NOT NULL,
          "content" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'VISIBLE',
          "authorId" TEXT,
          "ipHash" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
        )`)
        await tx.$executeRawUnsafe(
          `INSERT INTO "Comment" (id, postId, content, status, authorId, ipHash, createdAt)
           SELECT id, postId, content, status, authorId, ipHash, createdAt FROM "Comment__legacy"`,
        )
        await tx.$executeRawUnsafe(`DROP TABLE "Comment__legacy"`)
        await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Comment_postId_status_createdAt_idx" ON "Comment"("postId", "status", "createdAt")`)
        await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Comment_createdAt_idx" ON "Comment"("createdAt")`)
        await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Comment_ipHash_createdAt_idx" ON "Comment"("ipHash", "createdAt")`)
        await tx.$executeRawUnsafe(`PRAGMA foreign_keys=ON`)
      },
      { timeout: 30000 },
    )
    console.log('[migrate] Comment table rebuilt (FK reattached to User)')
  }

  // Step 2b: ALTER TABLE / rebuild for schema changes on existing tables.
  //
  // SQLite limitations we work around here:
  // - ALTER TABLE ADD COLUMN works fine (used below for User.email)
  // - ALTER TABLE ALTER COLUMN (drop NOT NULL) is NOT supported, so making
  //   User.password nullable requires a full table rebuild.
  // - All inside one transaction so a mid-flight error rolls back cleanly.

  const userCols = await tableInfo('User')
  const hasEmail = userCols.some((c) => c.name === 'email')
  const passwordInfo = userCols.find((c) => c.name === 'password')
  const usernameInfo = userCols.find((c) => c.name === 'username')
  // PRAGMA returns BigInt; coerce so === 0 compares correctly.
  const passwordIsNullable = Number(passwordInfo?.notnull ?? 1) === 0
  const usernameIsNullable = Number(usernameInfo?.notnull ?? 1) === 0

  if (!hasEmail || !passwordIsNullable || !usernameIsNullable) {
    await prisma.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe(`PRAGMA foreign_keys=OFF`)

        // SQLite quirk: ALTER TABLE ... RENAME does NOT rewrite foreign-key
        // references in *other* tables. After we rename User → User__legacy,
        // any FK like Comment.authorId REFERENCES User(id) silently becomes
        // REFERENCES User__legacy(id). When we drop User__legacy at the end,
        // those FKs point to a non-existent table → INSERT into Comment
        // fails with "table User__legacy does not exist".
        //
        // Fix: rebuild Comment (which has authorId → User FK) alongside User
        // so the new Comment picks up the new User table. We copy data.
        await tx.$executeRawUnsafe(`ALTER TABLE "User" RENAME TO "User__legacy"`)
        await tx.$executeRawUnsafe(`ALTER TABLE "Comment" RENAME TO "Comment__legacy"`)
        await tx.$executeRawUnsafe(`CREATE TABLE "User" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "username" TEXT,
          "password" TEXT,
          "email" TEXT,
          "isAdmin" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`)
        await tx.$executeRawUnsafe(`CREATE TABLE "Comment" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "postId" TEXT NOT NULL,
          "content" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'VISIBLE',
          "authorId" TEXT,
          "ipHash" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
        )`)
        await tx.$executeRawUnsafe(
          `INSERT INTO "User" (id, username, password, email, "isAdmin", "createdAt")
           SELECT id, username, password, NULL, "isAdmin", "createdAt" FROM "User__legacy"`,
        )
        await tx.$executeRawUnsafe(
          `INSERT INTO "Comment" (id, postId, content, status, authorId, ipHash, createdAt)
           SELECT id, postId, content, status, authorId, ipHash, createdAt FROM "Comment__legacy"`,
        )
        await tx.$executeRawUnsafe(`DROP TABLE "Comment__legacy"`)
        await tx.$executeRawUnsafe(`DROP TABLE "User__legacy"`)
        await tx.$executeRawUnsafe(`CREATE UNIQUE INDEX "User_username_key" ON "User"("username")`)
        await tx.$executeRawUnsafe(`CREATE UNIQUE INDEX "User_email_key" ON "User"("email")`)
        await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Comment_postId_status_createdAt_idx" ON "Comment"("postId", "status", "createdAt")`)
        await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Comment_createdAt_idx" ON "Comment"("createdAt")`)
        await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Comment_ipHash_createdAt_idx" ON "Comment"("ipHash", "createdAt")`)
        await tx.$executeRawUnsafe(`PRAGMA foreign_keys=ON`)
      },
      { timeout: 30000 },
    )
    console.log('[migrate] User + Comment tables rebuilt (FK references reattached)')
  }

  // Step 3: P4 add columns to User, Comment, Post.
  // Each addColumnIfMissing is idempotent on its own — safe to re-run.

  // User profile / paywall foundation columns
  await addColumnIfMissing('User', 'name', 'TEXT')
  await addColumnIfMissing('User', 'bio', 'TEXT')
  await addColumnIfMissing('User', 'avatarUrl', 'TEXT')
  await addColumnIfMissing('User', 'onboarded', 'BOOLEAN NOT NULL DEFAULT 0')
  await addColumnIfMissing('User', 'emailVerified', 'DATETIME')
  await addColumnIfMissing('User', 'notifyOnReply', 'BOOLEAN NOT NULL DEFAULT 1')
  await addColumnIfMissing('User', 'notifyOnNewPost', 'BOOLEAN NOT NULL DEFAULT 0')
  await addColumnIfMissing('User', 'deletedAt', 'DATETIME')
  await addColumnIfMissing('User', 'subscriptionTier', 'TEXT')
  await addColumnIfMissing('User', 'subscriptionExpiresAt', 'DATETIME')
  await addColumnIfMissing('User', 'purchasedPosts', 'TEXT')

  // Comment author snapshot columns
  await addColumnIfMissing('Comment', 'authorName', 'TEXT')
  await addColumnIfMissing('Comment', 'authorAvatar', 'TEXT')

  // P5: cross-browser pairing + OTP code support on VerificationToken.
  // Each new column is additive — old magic-link rows still work.
  await addColumnIfMissing('VerificationToken', 'pairToken', 'TEXT')
  await addColumnIfMissing('VerificationToken', 'code', 'TEXT')
  await addColumnIfMissing('VerificationToken', 'paired', 'BOOLEAN NOT NULL DEFAULT 0')
  await addColumnIfMissing('VerificationToken', 'consumed', 'BOOLEAN NOT NULL DEFAULT 0')
  await addIndexIfMissing('VerificationToken_pairToken_key', 'VerificationToken', ['pairToken'])
  await addIndexIfMissing('VerificationToken_code_key', 'VerificationToken', ['code'])

  // Comment.authorId index (for /u/[username] listing)
  await addIndexIfMissing('Comment_authorId_idx', 'Comment', ['authorId'])

  // Post paywall foundation columns
  await addColumnIfMissing('Post', 'accessTier', "TEXT NOT NULL DEFAULT 'free'")
  await addColumnIfMissing('Post', 'priceCents', 'INTEGER')

  // Step 4: bootstrap the existing creator admin with an email so they can
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
    // Mark creator as onboarded (they already have a username) and backfill
    // their display name from username if not already set.
    if (creator) {
      await prisma.user.update({
        where: { id: creator.id },
        data: {
          onboarded: true,
          name: creator.name ?? creator.username,
        },
      })
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