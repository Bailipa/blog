import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeHighlight from 'rehype-highlight'
import rehypeStringify from 'rehype-stringify'
import rehypeSlug from 'rehype-slug'
import GithubSlugger from 'github-slugger'
import { unstable_cache } from 'next/cache'

export async function markdownToHtml(md: string): Promise<string> {
  const result = await remark()
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeHighlight)
    .use(rehypeStringify)
    .process(md)
  return result.toString()
}

// markdownToHtml is CPU-heavy (remark/rehype + lowlight highlight). Cache the
// result keyed by the markdown itself; the tag lets admin saves invalidate it
// via revalidateTag('markdown') (see /api/posts & /api/posts/[id]).
export const getPostHtml = unstable_cache(
  async (md: string) => markdownToHtml(md),
  ['post-html'],
  { tags: ['markdown'], revalidate: 86400 },
)

export function extractToc(md: string): { id: string; text: string; level: number }[] {
  const toc: { id: string; text: string; level: number }[] = []
  const regex = /^(#{1,3})\s+(.+)$/gm
  const slugger = new GithubSlugger()
  let match: RegExpExecArray | null
  while ((match = regex.exec(md)) !== null) {
    const level = match[1].length
    const text = match[2].trim()
    const id = slugger.slug(text)
    toc.push({ id, text, level })
  }
  return toc
}
