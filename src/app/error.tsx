'use client'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="error-page">
      <div className="error-container">
        <h1 className="error-code">500</h1>
        <p className="error-message">出了点问题</p>
        <p className="error-desc">服务器遇到了意外错误，请稍后再试。</p>
        <button onClick={() => reset()} className="error-link">重试</button>
      </div>
    </div>
  )
}
