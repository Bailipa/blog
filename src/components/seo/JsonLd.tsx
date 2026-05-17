export function JsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: "Lee's Blog",
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    author: {
      '@type': 'Person',
      name: '辉洋',
      description: 'Full-Stack Developer & Creative Technologist',
    },
    description: '辉洋的博客 — 探索·创造·分享',
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
