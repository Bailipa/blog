import Link from 'next/link'

interface TagItem {
  name: string
  slug: string
  count: number
}

interface CategoryItem {
  slug: string
  name: string
  count: number
}

interface Props {
  tags: TagItem[]
  categories: CategoryItem[]
  totalPosts: number
  totalTags: number
}

function fontSizeFor(count: number, min: number, max: number): number {
  if (max === min) return 1
  const ratio = (count - min) / (max - min)
  return 0.8 + ratio * 0.7
}

export function TagCloudSidebar({ tags, categories, totalPosts, totalTags }: Props) {
  const counts = tags.map((t) => t.count)
  const minCount = counts.length > 0 ? Math.min(...counts) : 0
  const maxCount = counts.length > 0 ? Math.max(...counts) : 0

  const sortedCategories = [...categories].sort((a, b) => b.count - a.count)
  const topTags = [...tags].sort((a, b) => b.count - a.count).slice(0, 28)

  return (
    <aside className="tag-cloud-sidebar" aria-label="文章索引">
      <div className="tag-cloud-sidebar-inner">
        <div className="tag-cloud-block">
          <h3 className="tag-cloud-title">热门标签</h3>
          <p className="tag-cloud-desc">字号越大表示文章越多</p>
          <div className="tag-cloud-tags">
            {topTags.length === 0 ? (
              <p className="tag-cloud-empty">暂无标签</p>
            ) : (
              topTags.map((tag) => (
                <Link
                  key={tag.slug}
                  href={`/tags/${encodeURIComponent(tag.slug)}`}
                  className="tag-cloud-tag"
                  style={{ fontSize: `${fontSizeFor(tag.count, minCount, maxCount)}rem` }}
                  title={`${tag.name} (${tag.count} 篇)`}
                >
                  #{tag.name}
                </Link>
              ))
            )}
          </div>
          {totalTags > topTags.length && (
            <Link href="/tags" className="tag-cloud-more">查看全部 {totalTags} 个标签 →</Link>
          )}
        </div>

        <div className="tag-cloud-block">
          <h3 className="tag-cloud-title">所有分类</h3>
          <ul className="tag-cloud-cats">
            <li>
              <Link href="/blog" className="tag-cloud-cat">
                <span className="tag-cloud-cat-name">全部文章</span>
                <span className="tag-cloud-cat-count">{totalPosts}</span>
              </Link>
            </li>
            {sortedCategories.map((cat) => (
              <li key={cat.slug}>
                <Link href={`/categories/${cat.slug}`} className="tag-cloud-cat">
                  <span className="tag-cloud-cat-name">{cat.name}</span>
                  <span className="tag-cloud-cat-count">{cat.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="tag-cloud-block">
          <h3 className="tag-cloud-title">按时间浏览</h3>
          <ul className="tag-cloud-links">
            <li>
              <Link href="/archive" className="tag-cloud-link">
                <span className="tag-cloud-link-icon">📅</span>
                <span className="tag-cloud-link-name">完整归档</span>
              </Link>
            </li>
            <li>
              <Link href="/blog?period=week" className="tag-cloud-link">
                <span className="tag-cloud-link-icon">🔥</span>
                <span className="tag-cloud-link-name">本周发布</span>
              </Link>
            </li>
            <li>
              <Link href="/blog?period=month" className="tag-cloud-link">
                <span className="tag-cloud-link-icon">📆</span>
                <span className="tag-cloud-link-name">本月发布</span>
              </Link>
            </li>
            <li>
              <Link href="/blog?period=year" className="tag-cloud-link">
                <span className="tag-cloud-link-icon">📊</span>
                <span className="tag-cloud-link-name">今年发布</span>
              </Link>
            </li>
            <li>
              <Link href="/blog?sort=popular" className="tag-cloud-link">
                <span className="tag-cloud-link-icon">⭐</span>
                <span className="tag-cloud-link-name">最多阅读</span>
              </Link>
            </li>
            <li>
              <Link href="/blog?sort=featured" className="tag-cloud-link">
                <span className="tag-cloud-link-icon">✨</span>
                <span className="tag-cloud-link-name">精选文章</span>
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </aside>
  )
}