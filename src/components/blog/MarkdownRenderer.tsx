interface MarkdownRendererProps {
  html: string
}

// Server-rendered markdown. The actual HTML comes pre-styled by
// `prose prose-invert` (Tailwind Typography) on the wrapper, with
// per-element overrides in globals.css. rehype-slug has already added
// id="..." to every heading; `scroll-mt-20` on .prose headings ensures
// anchor scrolls don't get hidden by the fixed top nav.
export default function MarkdownRenderer({ html }: MarkdownRendererProps) {
  return (
    <div
      className="markdown-body prose prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
