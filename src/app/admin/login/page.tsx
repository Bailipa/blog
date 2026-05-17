'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', { username, password, redirect: false })

    if (result?.error) {
      setError('用户名或密码错误')
      setLoading(false)
    } else {
      router.push('/admin')
    }
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-box">
        <h1 className="admin-login-heading">管理员登录</h1>
        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="admin-login-field">
            <label htmlFor="username">用户名</label>
            <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
          </div>
          <div className="admin-login-field">
            <label htmlFor="password">密码</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="admin-login-error">{error}</p>}
          <button type="submit" disabled={loading} className="admin-login-btn">
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  )
}
