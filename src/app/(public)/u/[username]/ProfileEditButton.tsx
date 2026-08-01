'use client'

import Link from 'next/link'

export default function ProfileEditButton({ username }: { username: string }) {
  return (
    <Link href={`/u/${username}/edit`} className="profile-edit-btn">
      编辑资料
    </Link>
  )
}