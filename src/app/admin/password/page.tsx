'use client'

import { useState } from 'react'
import { useAdminToast } from '@/components/admin/ToastProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PasswordPage() {
  const { show } = useAdminToast()
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) { setError('两次密码不一致'); return }
    if (password.length < 6) { setError('密码至少6位'); return }

    setLoading(true)
    const res = await window.fetch('/api/admin/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: current, newPassword: password }),
    })
    setLoading(false)

    if (res.ok) {
      show('密码已修改')
      setCurrent(''); setPassword(''); setConfirm('')
    } else {
      const json = await res.json()
      setError(json.error || '修改失败')
    }
  }

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">修改密码</h1>
      <Card style={{ maxWidth: 420 }}>
        <CardHeader><CardTitle>修改登录密码</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="admin-login-form">
            <div className="admin-login-field">
              <label>当前密码</label>
              <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            </div>
            <div className="admin-login-field">
              <label>新密码</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="admin-login-field">
              <label>确认新密码</label>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            {error && <p className="admin-login-error">{error}</p>}
            <Button type="submit" disabled={loading}>{loading ? '修改中...' : '修改密码'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
