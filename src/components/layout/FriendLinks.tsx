const links = [
  { name: '张三的博客', url: '#', desc: '前端技术分享与生活随笔' },
  { name: '李四的实验室', url: '#', desc: '后端架构与系统设计' },
  { name: '王五的设计坊', url: '#', desc: 'UI/UX 设计与创意编程' },
  { name: '赵六的备忘录', url: '#', desc: '算法学习与技术笔记' },
]

export function FriendLinks() {
  return (
    <div className="friend-links">
      <h2 className="friend-links-title">友情链接</h2>
      <div className="friend-links-grid">
        {links.map((link) => (
          <a key={link.name} href={link.url} className="friend-link-card" target="_blank" rel="noopener noreferrer">
            <h3>{link.name}</h3>
            <p>{link.desc}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
