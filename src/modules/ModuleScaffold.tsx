import { Check, ChevronDown, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

export type ModuleSection = {
  id: string
  label: string
}

export function ModuleShell({
  code,
  title,
  subtitle,
  color,
  icon,
  sections,
  children,
}: {
  code: string
  title: string
  subtitle: string
  color: string
  icon: React.ReactNode
  sections: ModuleSection[]
  children: React.ReactNode
}) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (!visible) return
        const index = sections.findIndex((section) => section.id === visible.target.id)
        if (index >= 0) setActive(index)
      },
      { rootMargin: '-25% 0px -60%', threshold: [0.05, 0.25] },
    )
    sections.forEach((section) => {
      const element = document.getElementById(section.id)
      if (element) observer.observe(element)
    })
    return () => observer.disconnect()
  }, [sections])

  return (
    <div className="module-shell" style={{ '--module-color': color } as React.CSSProperties}>
      <aside className="module-rail">
        <div className="module-brand">
          <span>{icon}</span>
          <div>
            <small>{code}</small>
            <strong>{title}</strong>
          </div>
        </div>
        <nav>
          {sections.map((section, index) => (
            <button
              key={section.id}
              className={active === index ? 'active' : ''}
              onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' })}
            >
              <i>{index + 1}</i>
              <span>{section.label}</span>
              {active > index && <Check size={13} />}
            </button>
          ))}
        </nav>
        <div className="module-progress">
          <div>
            <span style={{ width: `${((active + 1) / sections.length) * 100}%` }} />
          </div>
          {active + 1} / {sections.length} sections
        </div>
      </aside>
      <main className="module-main">
        <section className="module-hero">
          <div className="module-hero-copy">
            <span className="module-kicker">
              <Sparkles size={13} /> Interactive module · {code}
            </span>
            <h1>{title}</h1>
            <p>{subtitle}</p>
            <button onClick={() => document.getElementById(sections[0].id)?.scrollIntoView({ behavior: 'smooth' })}>
              Begin module <ChevronDown size={16} />
            </button>
          </div>
          <div className="module-hero-mark" aria-hidden="true">
            {icon}
            <span>{code}</span>
          </div>
        </section>
        {children}
        <footer className="module-footer">
          <strong>{title}</strong>
          <span>Interactive companion to the supplied study material.</span>
        </footer>
      </main>
    </div>
  )
}

export function SectionIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children: React.ReactNode
}) {
  return (
    <header className="module-section-intro">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      <p>{children}</p>
    </header>
  )
}

export function ConceptNote({
  title,
  children,
  tone = 'neutral',
}: {
  title: string
  children: React.ReactNode
  tone?: 'neutral' | 'good' | 'warning'
}) {
  return (
    <div className={`concept-note note-${tone}`}>
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  )
}
