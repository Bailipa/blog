'use client'

import { useEffect, useState } from 'react'
import MDEditor from '@uiw/react-md-editor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useAdminToast } from '@/components/admin/ToastProvider'

interface SkillGroup {
  category: string
  items: string[]
}

interface SocialLink {
  label: string
  url: string
}

interface Experience {
  role: string
  org?: string
  period?: string
  description?: string
}

const defaultContent = `热爱探索技术与艺术的交汇点。专注于全栈开发、交互设计与创意编程。

相信代码可以是一种表达方式，每一行都是对完美的追求。热衷于开源社区，持续学习中。`

const defaultSkills: SkillGroup[] = [
  { category: '前端', items: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS'] },
  { category: '后端', items: ['Node.js', 'Python', 'Prisma', 'PostgreSQL'] },
  { category: '创意', items: ['SVG 动画', 'WebGL', '交互设计', '数据可视化'] },
]

const defaultSocialLinks: SocialLink[] = [
  { label: 'GitHub', url: 'https://github.com' },
  { label: 'Twitter', url: 'https://twitter.com' },
  { label: 'Email', url: 'mailto:hello@example.com' },
]

const defaultExperiences: Experience[] = []

export default function AdminAboutPage() {
  const { show } = useAdminToast()
  const [content, setContent] = useState(defaultContent)
  const [skills, setSkills] = useState<SkillGroup[]>(defaultSkills)
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(defaultSocialLinks)
  const [experiences, setExperiences] = useState<Experience[]>(defaultExperiences)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/site-config')
        if (!res.ok) return
        const json = await res.json()
        const data = json.data || {}
        if (data.about_content) setContent(data.about_content)
        if (data.about_skills) {
          try {
            const parsed = JSON.parse(data.about_skills)
            if (Array.isArray(parsed)) setSkills(parsed)
          } catch {}
        }
        if (data.social_links) {
          try {
            const parsed = JSON.parse(data.social_links)
            if (Array.isArray(parsed)) setSocialLinks(parsed)
          } catch {}
        }
        if (data.about_experiences) {
          try {
            const parsed = JSON.parse(data.about_experiences)
            if (Array.isArray(parsed)) setExperiences(parsed)
          } catch {}
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const addGroup = () => setSkills([...skills, { category: '', items: [] }])
  const removeGroup = (i: number) => setSkills(skills.filter((_, idx) => idx !== i))

  const updateGroup = (i: number, category: string) => {
    const next = [...skills]
    next[i] = { ...next[i], category }
    setSkills(next)
  }

  const addTag = (i: number) => {
    const next = [...skills]
    next[i] = { ...next[i], items: [...next[i].items, ''] }
    setSkills(next)
  }

  const removeTag = (gi: number, ti: number) => {
    const next = [...skills]
    next[gi] = { ...next[gi], items: next[gi].items.filter((_, idx) => idx !== ti) }
    setSkills(next)
  }

  const updateTag = (gi: number, ti: number, val: string) => {
    const next = [...skills]
    next[gi].items[ti] = val
    setSkills(next)
  }

  const addSocialLink = () => setSocialLinks([...socialLinks, { label: '', url: '' }])
  const removeSocialLink = (i: number) => setSocialLinks(socialLinks.filter((_, idx) => idx !== i))
  const updateSocialLink = (i: number, field: 'label' | 'url', val: string) => {
    const next = [...socialLinks]
    next[i] = { ...next[i], [field]: val }
    setSocialLinks(next)
  }

  const addExperience = () => setExperiences([...experiences, { role: '', org: '', period: '', description: '' }])
  const removeExperience = (i: number) => setExperiences(experiences.filter((_, idx) => idx !== i))
  const updateExperience = (i: number, field: keyof Experience, val: string) => {
    const next = [...experiences]
    next[i] = { ...next[i], [field]: val }
    setExperiences(next)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/site-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          about_content: content,
          about_skills: JSON.stringify(skills),
          social_links: JSON.stringify(socialLinks),
          about_experiences: JSON.stringify(experiences),
        }),
      })
      if (res.ok) {
        show('关于页面已保存')
      } else {
        const json = await res.json()
        show(json.error || '保存失败', 'error')
      }
    } catch {
      show('保存失败', 'error')
    }
    setSaving(false)
  }

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">关于页面设置</h1>

      {loading && (
        <p className="admin-loading" role="status">加载中...</p>
      )}

      <Card className="admin-form-card">
        <CardContent>
          <div className="admin-editor-field" data-color-mode="dark">
            <h2 className="admin-section-title">个人简介 (Markdown)</h2>
            <MDEditor
              value={content}
              onChange={(v) => setContent(v || '')}
              height={400}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="admin-form-card" style={{ marginTop: 24 }}>
        <CardContent>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 className="admin-section-title">技能分组</h2>
            <Button onClick={addGroup} variant="outline" size="sm">+ 添加分组</Button>
          </div>

          {skills.map((group, gi) => (
            <div key={gi} className="admin-about-skill-group" style={{ marginBottom: 16, padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <Input
                  value={group.category}
                  onChange={(e) => updateGroup(gi, e.target.value)}
                  placeholder="分组名称（如：前端）"
                  style={{ maxWidth: 200 }}
                />
                <Button variant="outline" size="sm" onClick={() => addTag(gi)}>+ 标签</Button>
                <Button variant="destructive" size="sm" onClick={() => removeGroup(gi)}>删除分组</Button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {group.items.map((tag, ti) => (
                  <div key={ti} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <Input
                      value={tag}
                      onChange={(e) => updateTag(gi, ti, e.target.value)}
                      placeholder="技能标签"
                      style={{ width: 140 }}
                    />
                    <button
                      type="button"
                      onClick={() => removeTag(gi, ti)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1.1rem', padding: '2px 4px' }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="admin-form-card" style={{ marginTop: 24 }}>
        <CardContent>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 className="admin-section-title">社交按钮</h2>
            <Button onClick={addSocialLink} variant="outline" size="sm">+ 添加按钮</Button>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: 12 }}>
            图标根据 URL 自动匹配：github.com / twitter.com / x.com / linkedin.com / mailto:
          </p>
          {socialLinks.map((link, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <Input
                value={link.label}
                onChange={(e) => updateSocialLink(i, 'label', e.target.value)}
                placeholder="按钮文字"
                style={{ maxWidth: 160 }}
              />
              <Input
                value={link.url}
                onChange={(e) => updateSocialLink(i, 'url', e.target.value)}
                placeholder="https://..."
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={() => removeSocialLink(i)}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1.2rem', padding: '4px 8px' }}
              >
                ×
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="admin-form-card" style={{ marginTop: 24 }}>
        <CardContent>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 className="admin-section-title">经历时间线</h2>
            <Button onClick={addExperience} variant="outline" size="sm">+ 添加经历</Button>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: 12 }}>
            按时间倒序展示。period 示例：2023 - 至今；org 为机构/公司名；description 可选。
          </p>
          {experiences.map((exp, i) => (
            <div key={i} style={{ marginBottom: 16, padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                <Input
                  value={exp.role}
                  onChange={(e) => updateExperience(i, 'role', e.target.value)}
                  placeholder="职位/角色"
                  style={{ flex: 1, minWidth: 160 }}
                />
                <Input
                  value={exp.period || ''}
                  onChange={(e) => updateExperience(i, 'period', e.target.value)}
                  placeholder="时间（如 2023 - 至今）"
                  style={{ width: 180 }}
                />
                <Button variant="destructive" size="sm" onClick={() => removeExperience(i)}>删除</Button>
              </div>
              <Input
                value={exp.org || ''}
                onChange={(e) => updateExperience(i, 'org', e.target.value)}
                placeholder="机构/公司（可选）"
                style={{ marginBottom: 8 }}
              />
              <Input
                value={exp.description || ''}
                onChange={(e) => updateExperience(i, 'description', e.target.value)}
                placeholder="简述（可选）"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
        <Button onClick={handleSave} disabled={saving || loading}>
          {saving ? '保存中...' : '保存'}
        </Button>
      </div>
    </div>
  )
}
