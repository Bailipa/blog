import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkHtml from 'remark-html'

export async function markdownToHtml(md: string): Promise<string> {
  const result = await remark().use(remarkGfm).use(remarkHtml).process(md)
  return result.toString()
}

export function extractToc(md: string): { id: string; text: string; level: number }[] {
  const toc: { id: string; text: string; level: number }[] = []
  const regex = /^(#{1,3})\s+(.+)$/gm
  let match: RegExpExecArray | null
  while ((match = regex.exec(md)) !== null) {
    const level = match[1].length
    const text = match[2].trim()
    const id = text
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff\s-]/g, '')
      .replace(/\s+/g, '-')
    toc.push({ id, text, level })
  }
  return toc
}

export function estimateReadTime(md: string): number {
  const text = md.replace(/[#*`\n]/g, ' ').trim()
  if (!text) return 0
  const wordCount = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(wordCount / 200))
}
