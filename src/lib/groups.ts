type CategoryRef = { slug?: string } | null

type PostWithCategory = {
  id: string
  categoryId?: string | null
  category?: CategoryRef
  publishedAt?: Date | string | null
}

type CategoryWithPosts = {
  id: string
  name: string
  slug: string
  description: string | null
  sortOrder: number
}

type CategoryGroup<T extends PostWithCategory> = {
  category: CategoryWithPosts
  posts: T[]
}

export function groupPostsByCategory<T extends PostWithCategory>(
  posts: T[],
  categories: CategoryWithPosts[],
  options: { minPosts?: number; maxPostsPerCategory?: number } = {}
): CategoryGroup<T>[] {
  const { minPosts = 1, maxPostsPerCategory } = options
  const buckets = new Map<string, T[]>()
  for (const post of posts) {
    const slug = post.category?.slug
    if (!slug) continue
    if (!buckets.has(slug)) buckets.set(slug, [])
    buckets.get(slug)!.push(post)
  }
  const groups: CategoryGroup<T>[] = []
  for (const category of categories) {
    const list = buckets.get(category.slug)
    if (!list || list.length < minPosts) continue
    const clipped = maxPostsPerCategory !== undefined ? list.slice(0, maxPostsPerCategory) : list
    groups.push({ category, posts: clipped })
  }
  return groups
}

export function splitFeaturedFirst<T extends { featured?: boolean; publishedAt?: Date | string | null }>(
  posts: T[]
): { featured: T | null; rest: T[] } {
  const sorted = [...posts].sort((a, b) => {
    if ((b.featured ? 1 : 0) !== (a.featured ? 1 : 0)) return (b.featured ? 1 : 0) - (a.featured ? 1 : 0)
    const ad = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
    const bd = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
    return bd - ad
  })
  const firstFeatured = sorted.find((p) => p.featured) ?? sorted[0] ?? null
  const rest = firstFeatured ? sorted.filter((p) => p !== firstFeatured) : []
  return { featured: firstFeatured, rest }
}

type MonthGroup<T> = { year: number; month: number; posts: T[] }
type YearGroup<T> = { year: number; months: MonthGroup<T>[]; total: number }

export function groupPostsByYearMonth<T extends { publishedAt?: Date | string | null }>(posts: T[]): YearGroup<T>[] {
  const byYear = new Map<number, Map<number, T[]>>()
  for (const post of posts) {
    if (!post.publishedAt) continue
    const d = new Date(post.publishedAt)
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    if (!byYear.has(year)) byYear.set(year, new Map())
    const yearMap = byYear.get(year)!
    if (!yearMap.has(month)) yearMap.set(month, [])
    yearMap.get(month)!.push(post)
  }
  const years = Array.from(byYear.entries())
    .sort(([a], [b]) => b - a)
    .map<YearGroup<T>>(([year, monthsMap]) => {
      const months = Array.from(monthsMap.entries())
        .sort(([a], [b]) => b - a)
        .map<MonthGroup<T>>(([month, posts]) => ({ year, month, posts }))
      const total = months.reduce((sum, m) => sum + m.posts.length, 0)
      return { year, months, total }
    })
  return years
}

export function formatYearMonth(year: number, month: number): string {
  return `${year} 年 ${String(month).padStart(2, '0')} 月`
}