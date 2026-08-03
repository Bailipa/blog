// Backfill Post.coverImage for posts that have no cover yet.
// Generates a deterministic SVG data URI using each post's id hash.
// Safe to re-run: skips posts that already have a coverImage.
const { PrismaClient } = require('../src/generated/prisma')

const THEMES = [
  { from: '#1a1d2e', to: '#3d2e5c', accent: '#9d7ce6' },
  { from: '#2e1a1d', to: '#5c2e3d', accent: '#e67c9d' },
  { from: '#1a2e1d', to: '#2e5c3d', accent: '#7ce69d' },
  { from: '#2e2e1a', to: '#5c5c2e', accent: '#e6c97c' },
  { from: '#1a2e2e', to: '#2e5c5c', accent: '#7ce6c9' },
  { from: '#2e1a2e', to: '#5c2e5c', accent: '#c97ce6' },
  { from: '#1a2230', to: '#2e3d5c', accent: '#7c9de6' },
  { from: '#30221a', to: '#5c3d2e', accent: '#e69d7c' },
]

function pickTheme(seed) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return THEMES[Math.abs(hash) % THEMES.length]
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildSvg(post, theme) {
  const initial = escapeXml((post.title || '文').trim().slice(0, 1))
  const catLabel = post.category ? escapeXml(post.category.name) : ''
  const fontFamily = "'Georgia', 'Songti SC', 'STSong', 'Source Han Serif SC', serif"
  const accentA = theme.accent + '33'
  const accentB = theme.accent + '22'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${theme.from}"/><stop offset="1" stop-color="${theme.to}"/></linearGradient><radialGradient id="a" cx="0.25" cy="0.3" r="0.55"><stop offset="0" stop-color="${accentA}"/><stop offset="1" stop-color="${accentA.slice(0, -2)}00"/></radialGradient><radialGradient id="b" cx="0.75" cy="0.75" r="0.5"><stop offset="0" stop-color="${accentB}"/><stop offset="1" stop-color="${accentB.slice(0, -2)}00"/></radialGradient></defs><rect width="800" height="450" fill="url(#g)"/><rect width="800" height="450" fill="url(#a)"/><rect width="800" height="450" fill="url(#b)"/><text x="400" y="225" fill="rgba(255,255,255,0.88)" font-family="${fontFamily}" font-size="220" font-weight="900" text-anchor="middle" dominant-baseline="central">${initial}</text>${
    catLabel
      ? `<g><rect x="40" y="380" width="${30 + catLabel.length * 16}" height="34" rx="17" fill="rgba(0,0,0,0.32)"/><text x="${50 + 8}" y="397" fill="rgba(255,255,255,0.85)" font-family="${fontFamily}" font-size="18" font-weight="600" letter-spacing="1">${catLabel}</text></g>`
      : ''
  }</svg>`
}

function buildDataUri(svg) {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

async function main() {
  const prisma = new PrismaClient()
  try {
    const posts = await prisma.post.findMany({
      where: { OR: [{ coverImage: null }, { coverImage: '' }] },
      include: { category: { select: { name: true } } },
    })
    if (posts.length === 0) {
      console.log('[backfill] No posts need covers. Exiting.')
      return
    }
    console.log(`[backfill] Found ${posts.length} posts without covers.`)
    let success = 0
    let failed = 0
    for (const post of posts) {
      try {
        const theme = pickTheme(post.id)
        const svg = buildSvg(post, theme)
        const dataUri = buildDataUri(svg)
        await prisma.post.update({
          where: { id: post.id },
          data: { coverImage: dataUri },
        })
        success++
        if (success % 10 === 0 || success === posts.length) {
          console.log(`[backfill] ${success}/${posts.length} updated`)
        }
      } catch (err) {
        failed++
        console.error(`[backfill] Failed for post ${post.id}:`, err.message)
      }
    }
    console.log(`[backfill] Done. success=${success} failed=${failed}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error('[backfill] Fatal:', err)
  process.exit(1)
})