export type PostStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
export type Lang = 'zh' | 'en'

export interface Post {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string | null
  coverImage: string | null
  status: PostStatus
  featured: boolean
  viewCount: number
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
  categoryId: string | null
  category: Category | null
  tags: PostTag[]
  translations: PostTranslation[]
}

export interface PostListItem {
  id: string
  title: string
  slug: string
  excerpt: string | null
  publishedAt: Date | null
  category: { name: string } | null
  tags: { tag: { name: string } }[]
}

export interface PostTranslation {
  id: string
  postId: string
  lang: Lang
  title: string
  content: string
  excerpt: string | null
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  sortOrder: number
}

export interface Tag {
  id: string
  name: string
  slug: string
}

export interface PostTag {
  postId: string
  tagId: string
  tag: Tag
}

export interface Project {
  id: string
  name: string
  slug: string
  description: string
  longDesc: string | null
  url: string
  repoUrl: string | null
  coverImage: string | null
  techStack: string
  featured: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface User {
  id: string
  username: string
  isAdmin: boolean
  createdAt: Date
}

export interface Mumble {
  id: string
  content: string
  createdAt: Date
}

export interface FriendLink {
  id: string
  name: string
  url: string
  description: string | null
  sortOrder: number
}

export interface SiteConfig {
  key: string
  value: string
}

export interface ApiResponse<T> {
  data?: T
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
