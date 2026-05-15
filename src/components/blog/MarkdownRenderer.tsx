interface MarkdownRendererProps {
  html: string
}

export default function MarkdownRenderer({ html }: MarkdownRendererProps) {
  return (
    <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
  )
}
