import { cn } from '@/lib/utils'

const COVER_THEMES: Array<{ from: string; to: string; accent: string }> = [
  { from: '#1a1d2e', to: '#3d2e5c', accent: '#9d7ce6' },
  { from: '#2e1a1d', to: '#5c2e3d', accent: '#e67c9d' },
  { from: '#1a2e1d', to: '#2e5c3d', accent: '#7ce69d' },
  { from: '#2e2e1a', to: '#5c5c2e', accent: '#e6c97c' },
  { from: '#1a2e2e', to: '#2e5c5c', accent: '#7ce6c9' },
  { from: '#2e1a2e', to: '#5c2e5c', accent: '#c97ce6' },
  { from: '#1a2230', to: '#2e3d5c', accent: '#7c9de6' },
  { from: '#30221a', to: '#5c3d2e', accent: '#e69d7c' },
]

export function pickCoverTheme(seed: string): { from: string; to: string; accent: string } {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  const idx = Math.abs(hash) % COVER_THEMES.length
  return COVER_THEMES[idx]
}

type Props = {
  seed: string
  className?: string
}

export function CoverPlaceholder({ seed, className }: Props) {
  const theme = pickCoverTheme(seed)
  const isFeatured = className?.includes('featured-hero-cover-gradient')
  const baseBg = isFeatured
    ? `linear-gradient(135deg, ${theme.from} 0%, ${theme.accent} 50%, ${theme.to} 100%)`
    : `linear-gradient(90deg, ${theme.from} 0%, ${theme.accent} 50%, ${theme.to} 100%)`
  const shineBg = isFeatured
    ? `linear-gradient(135deg, transparent 0%, ${theme.accent}66 45%, ${theme.from}88 100%)`
    : `linear-gradient(90deg, transparent 0%, ${theme.accent}88 50%, transparent 100%)`
  return (
    <div
      className={cn('cover-placeholder', className)}
      style={{ background: baseBg }}
      aria-hidden="true"
    >
      <span
        className="cover-placeholder-shine"
        style={{ background: shineBg }}
      />
    </div>
  )
}