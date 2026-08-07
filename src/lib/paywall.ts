// Paywall helpers. The third-party storefront (面包多 / mbd.pub) handles
// payment and auto-delivers a redeem code; this site validates codes and
// unlocks content. Preview truncation happens on the raw markdown *before*
// rendering so the locked portion never reaches the HTML.

/** Max characters of a paid post shown to non-purchasers. */
export const PREVIEW_CHARS = 600

/** Split raw markdown at a heading/sentence boundary near the limit. */
export function truncateMarkdown(md: string, limit = PREVIEW_CHARS): string {
  if (md.length <= limit) return md
  let cut = limit

  // Back off to the previous newline if we land mid-line.
  const nl = md.lastIndexOf('\n', limit)
  if (nl > limit * 0.6) cut = nl

  // Never split an inline code span or code fence. If we cut inside a ```
  // block, close it so the rendered preview doesn't swallow the paywall.
  const fenceOpen = md.lastIndexOf('\n```', cut)
  const fenceClose = md.lastIndexOf('```', cut)
  if (fenceOpen > fenceClose) {
    // we are inside a fenced block — append a closing fence
    return md.slice(0, cut).trimEnd() + '\n```\n'
  }
  return md.slice(0, cut).trimEnd()
}

export function formatPrice(priceCents: number | null | undefined): string {
  if (!priceCents || priceCents <= 0) return '¥6.66'
  return `¥${(priceCents / 100).toFixed(2)}`
}

/** True when the user's purchasedPosts JSON contains the post id. */
export function hasPurchased(
  purchasedPostsJson: string | null | undefined,
  postId: string,
): boolean {
  if (!purchasedPostsJson) return false
  try {
    const arr = JSON.parse(purchasedPostsJson) as unknown
    return Array.isArray(arr) && arr.includes(postId)
  } catch {
    return false
  }
}
