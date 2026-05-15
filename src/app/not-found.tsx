import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="error-page">
      <div className="error-container">
        <h1 className="error-code">404</h1>
        <p className="error-message">页面未找到</p>
        <p className="error-desc">你寻找的页面可能已被移除、改名或暂时不可用。</p>
        <Link href="/" className="error-link">返回首页</Link>
      </div>
    </div>
  )
}
