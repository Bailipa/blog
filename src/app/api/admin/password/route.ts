import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
export const runtime = 'nodejs'
import { hash } from 'bcryptjs'
import prisma from '@/lib/prisma'
import { apiErrorHandler } from '@/lib/apiErrorHandler'

export async function PUT(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { currentPassword, newPassword } = await req.json()
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: '密码至少6位' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { username: session.user.name! } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { compare } = await import('bcryptjs')
    if (!user.password) {
      return NextResponse.json({ error: '当前账号未设置密码，请先通过 set-admin-password 脚本初始化。' }, { status: 400 })
    }
    const valid = await compare(currentPassword, user.password)
    if (!valid) return NextResponse.json({ error: '当前密码错误' }, { status: 400 })

    const hashed = await hash(newPassword, 12)
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } })

    return NextResponse.json({ data: { ok: true } })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}
