import PostEditor from '@/components/admin/PostEditor'

export default function NewPostPage() {
  return (
    <div className="admin-page">
      <h1 className="admin-page-title">写新文章</h1>
      <PostEditor />
    </div>
  )
}
