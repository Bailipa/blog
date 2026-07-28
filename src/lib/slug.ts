import { createId } from '@paralleldrive/cuid2'

const SLUG_MAX_LEN = 80

/**
 * Normalize a user-typed slug. Returns null when the input doesn't produce a
 * usable URL segment after sanitization. Server side uses this to decide
 * whether to fall back to a generated slug.
 *
 * Rules:
 *   - lowercase
 *   - replace any run of characters outside [a-z0-9-] with a single hyphen
 *   - trim leading/trailing hyphens
 *   - clamp to SLUG_MAX_LEN chars
 *   - return null if the result is empty (caller should generate a fallback)
 */
export function normalizeSlug(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  if (!trimmed) return null
  const lower = trimmed.toLowerCase()
  const collapsed = lower
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  const clipped = collapsed.slice(0, SLUG_MAX_LEN).replace(/-+$/, '')
  return clipped || null
}

/**
 * Generate a cuid2-style slug for fallback use. URL-safe (no hyphens, all
 * lowercase alphanumeric), 24 chars by default. Matches the visual style
 * of Prisma's own cuid IDs (which are v1; this is v2 from cuid2).
 */
export function generateSlug(): string {
  return createId()
}

/**
 * Resolve a user-provided slug. Returns the normalized user value, or a fresh
 * generated slug when the user left it empty.
 */
export function resolveSlug(userInput: unknown): string {
  return normalizeSlug(userInput) ?? generateSlug()
}