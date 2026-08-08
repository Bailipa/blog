// POST /api/users/avatar — multipart upload of an avatar image.
//   - 1MB hard limit (R3)
//   - JPEG/PNG/WebP only
//   - Stored at public/uploads/avatars/{userId}.{ext}
//   - Updates User.avatarUrl to the local path
//
// Replaces an existing avatar for the same user. The previous file is
// overwritten with the new one (we never accumulate stale files).

import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, unlink, readdir } from 'fs/promises'
import path from 'path'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { apiErrorHandler } from '@/lib/apiErrorHandler'
import { AVATAR_MAX_BYTES, AVATAR_ALLOWED_MIME } from '@/lib/username'

export const runtime = 'nodejs'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars')

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const form = await req.formData()
    const file = form.get('file')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: '未找到文件' }, { status: 400 })
    }

    const blob = file as File
    if (blob.size === 0) {
      return NextResponse.json({ error: '文件为空' }, { status: 400 })
    }
    if (blob.size > AVATAR_MAX_BYTES) {
      return NextResponse.json(
        { error: `文件超过 ${Math.floor(AVATAR_MAX_BYTES / 1024)}KB 限制` },
        { status: 413 },
      )
    }
    if (!AVATAR_ALLOWED_MIME.has(blob.type)) {
      return NextResponse.json(
        { error: '仅支持 JPEG / PNG / WebP 格式' },
        { status: 415 },
      )
    }

    const ext = EXT_BY_MIME[blob.type]
    // 用「用户id + 时间戳」命名，确保每次上传 URL 唯一 —— 否则固定名
    // {userId}.{ext} 会让浏览器/Next Image 命中缓存，显示旧头像。
    const ts = Date.now()
    const filename = `${session.user.id}-${ts}.${ext}`
    await mkdir(UPLOAD_DIR, { recursive: true })

    // Delete any previous variant (jpg/png/webp) for this user so we don't
    // accumulate stale files. Same-user overwrite is the only case we
    // handle here.
    for (const e of Object.values(EXT_BY_MIME)) {
      await unlink(path.join(UPLOAD_DIR, `${session.user.id}.${e}`)).catch(() => {})
      // 兼容旧格式 {userId}.{ext} 与当前格式 {userId}-{ts}.{ext} 的历史文件
      const old = await readdir(UPLOAD_DIR).catch(() => [] as string[])
      for (const f of old) {
        if (f.startsWith(`${session.user.id}-`) && f.endsWith(`.${e}`)) {
          await unlink(path.join(UPLOAD_DIR, f)).catch(() => {})
        }
      }
    }

    const bytes = Buffer.from(await blob.arrayBuffer())
    const dest = path.join(UPLOAD_DIR, filename)
    await writeFile(dest, bytes)

    const url = `/uploads/avatars/${filename}`
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl: url },
      select: { id: true, avatarUrl: true },
    })

    return NextResponse.json({ ok: true, avatarUrl: updated.avatarUrl })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}

// DELETE /api/users/avatar — clear avatar override, revert to Gravatar.
export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }
    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl: null },
    })
    // Best-effort: remove the local file if any.
    if (session.user.id) {
      for (const ext of Object.values(EXT_BY_MIME)) {
        await unlink(path.join(UPLOAD_DIR, `${session.user.id}.${ext}`)).catch(() => {})
        const old = await readdir(UPLOAD_DIR).catch(() => [] as string[])
        for (const f of old) {
          if (f.startsWith(`${session.user.id}-`) && f.endsWith(`.${ext}`)) {
            await unlink(path.join(UPLOAD_DIR, f)).catch(() => {})
          }
        }
      }
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    const { status, body } = apiErrorHandler(err)
    return NextResponse.json(body, { status })
  }
}