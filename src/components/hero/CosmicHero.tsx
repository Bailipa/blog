'use client'

import * as React from 'react'
import { HeroRings } from './HeroRings'
import { TaijiCenter } from './TaijiCenter'
import AxialDots from './AxialDots'

export default function CosmicHero() {
  const [heroRightRevealed, setHeroRightRevealed] = React.useState(false)
  const [heroLeftRevealed, setHeroLeftRevealed] = React.useState(false)
  const [navRevealed, setNavRevealed] = React.useState(false)

  React.useEffect(() => {
    const t1 = setTimeout(() => setHeroRightRevealed(true), 100)
    const t2 = setTimeout(() => setHeroLeftRevealed(true), 1500)
    const t3 = setTimeout(() => setNavRevealed(true), 1900)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  return (
    <>
      <nav className={`nav${navRevealed ? ' revealed' : ''}`}>
        <div className="nav-logo">Lee's Blog</div>
        <ul className="nav-links">
          <li><a href="#">首页</a></li>
          <li><a href="#posts">博客</a></li>
          <li><a href="#projects">作品</a></li>
          <li><a href="#about">关于</a></li>
        </ul>
      </nav>

      <section className="hero snap-page">
        <div className="hero-spotlight" id="heroSpotlight" />

        <div className={`hero-left${heroLeftRevealed ? ' revealed' : ''}`}>
          <div className="hero-tag">探索·创造·分享</div>
          <h1 className="hero-title">辉洋的博客</h1>
          <p className="hero-subtitle">Full-Stack Developer &amp; Creative Technologist</p>
          <p className="hero-desc">从代码到艺术。</p>
          <div className="hero-cta">
            <a href="#posts" className="cta-primary">浏览文章</a>
            <a href="#projects" className="cta-secondary">查看作品</a>
          </div>
        </div>

        <div className={`hero-right${heroRightRevealed ? ' revealed' : ''}`}>
          <div className="hero-right-inner" id="heroRightInner">
            <svg
              className="qimen-svg"
              viewBox="0 0 1600 900"
              preserveAspectRatio="xMidYMid slice"
              xmlns="http://www.w3.org/2000/svg"
            >
              <HeroRings />
              <AxialDots />
              <TaijiCenter />
            </svg>
          </div>
        </div>
      </section>
    </>
  )
}
