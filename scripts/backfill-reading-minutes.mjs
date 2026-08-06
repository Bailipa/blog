#!/usr/bin/env node
// One-shot backfill for Post.readingMinutes.
//
// Run on the server against the live SQLite DB:
//   cd /www/wwwroot/blog.dogeggcode.cyou/lb-blog
//   set -a && . ./.env.production && set +a
//   node scripts/backfill-reading-minutes.mjs
//
// Idempotent: recomputes every row every time, safe to re-run.
// Algorithm mirrors src/lib/readingTime.ts (keep in sync).
import { PrismaClient } from '../src/generated/prisma/client.js'

const prisma = new PrismaClient()

const FENCED_CODE_RE = /```[\s\S]*?```/g
const INLINE_CODE_RE = /`[^`\n]+`/g
const CN_CHAR_RE = /[\u4e00-\u9fa5]/g
const EN_WORD_RE = /[A-Za-z]+/g

function readingMinutes(markdown) {
  if (!markdown) return 1
  const codeBlocks = markdown.match(FENCED_CODE_RE) ?? []
  const codeChars = codeBlocks.reduce((s, b) => s + b.length, 0)
  const inlineCodes = markdown.match(INLINE_CODE_RE) ?? []
  const inlineCodeChars = inlineCodes.reduce((s, b) => s + b.length, 0)
  const text = markdown.replace(FENCED_CODE_RE, '').replace(INLINE_CODE_RE, '')
  const cnChars = (text.match(CN_CHAR_RE) ?? []).length
  const enWords = (text.match(EN_WORD_RE) ?? []).length
  const minutes =
    cnChars / 400 + enWords / 250 + (codeChars + inlineCodeChars) / 800
  return Math.max(1, Math.ceil(minutes))
}

async function main() {
  const posts = await prisma.post.findMany({ select: { id: true, content: true } })
  console.log(`[backfill] ${posts.length} posts to process`)
  let updated = 0
  for (const p of posts) {
    const mins = readingMinutes(p.content)
    await prisma.post.update({ where: { id: p.id }, data: { readingMinutes: mins } })
    updated++
  }
  const samples = await prisma.post.findMany({
    select: { title: true, readingMinutes: true },
    orderBy: { readingMinutes: 'desc' },
    take: 5,
  })
  console.log(`[backfill] done: ${updated}/${posts.length} updated`)
  console.log('[backfill] top 5 by readingMinutes:', JSON.stringify(samples, null, 2))
}

main()
  .catch((e) => {
    console.error('[backfill] failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
