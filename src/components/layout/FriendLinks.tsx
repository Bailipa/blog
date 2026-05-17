import prisma from '@/lib/prisma'

export async function FriendLinks() {
  const links = await prisma.friendLink.findMany({
    orderBy: { sortOrder: 'asc' },
  })

  if (links.length === 0) return null

  return (
    <div className="friend-links">
      <h2 className="friend-links-title">友情链接</h2>
      <div className="friend-links-grid">
        {links.map((link) => (
          <a key={link.id} href={link.url} className="friend-link-card" target="_blank" rel="noopener noreferrer">
            <h3>{link.name}</h3>
            {link.description && <p>{link.description}</p>}
          </a>
        ))}
      </div>
    </div>
  )
}
