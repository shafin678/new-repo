import {
  ArrowRight,
  BookOpen,
  Calculator,
  ChevronDown,
  Database,
  Gauge,
  Menu,
  Network,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import HashingCanvas from './App'
import EstimationModule from './modules/EstimationModule'
import KeyValueModule from './modules/KeyValueModule'
import MathPracticeModule from './modules/MathPracticeModule'
import RateLimiterModule from './modules/RateLimiterModule'
import './study.css'

export type TopicId = 'library' | 'hashing' | 'rate-limiter' | 'key-value' | 'estimation' | 'math'

const TOPICS = [
  {
    id: 'hashing' as const,
    number: '01',
    title: 'Consistent Hashing',
    description: 'Place keys on a ring, resize safely, and balance with virtual nodes.',
    meta: '6 guided lessons',
    icon: <Network size={24} />,
    color: 'purple',
  },
  {
    id: 'rate-limiter' as const,
    number: '02',
    title: 'Design a Rate Limiter',
    description: 'Control bursts, compare five algorithms, and design a distributed limiter.',
    meta: '5 algorithms · architecture',
    icon: <ShieldCheck size={24} />,
    color: 'coral',
  },
  {
    id: 'key-value' as const,
    number: '03',
    title: 'Design a Key-Value Store',
    description: 'Explore CAP, quorums, replication, conflicts, failures, and storage paths.',
    meta: '9 core concepts',
    icon: <Database size={24} />,
    color: 'teal',
  },
  {
    id: 'estimation' as const,
    number: '04',
    title: 'Back-of-the-Envelope',
    description: 'Build intuition for powers, latency, availability, QPS, and storage.',
    meta: '4 live calculators',
    icon: <Calculator size={24} />,
    color: 'amber',
  },
  {
    id: 'math' as const,
    number: '05',
    title: 'Math Practice',
    description: 'Step through every supplied rate-limit and weighted-latency example.',
    meta: '6 worked exercises',
    icon: <Gauge size={24} />,
    color: 'blue',
  },
]

function topicFromHash(): TopicId {
  const topic = window.location.hash.replace('#', '') as TopicId
  return ['hashing', 'rate-limiter', 'key-value', 'estimation', 'math'].includes(topic) ? topic : 'library'
}

function Library({ onOpen }: { onOpen: (topic: TopicId) => void }) {
  return (
    <div className="library-page">
      <header className="library-topbar">
        <div className="library-brand">
          <span>
            <BookOpen size={19} />
          </span>
          <strong>System Design Studio</strong>
        </div>
        <div className="library-source">
          <Sparkles size={14} /> 5 visual study modules
        </div>
      </header>

      <main className="library-main">
        <section className="library-hero">
          <div>
            <span className="library-kicker">Your interactive study desk</span>
            <h1>
              Read less.
              <br />
              <em>Understand more.</em>
            </h1>
          </div>
          <div className="library-intro">
            <p>
              Complex system-design chapters rebuilt as small experiments you can touch, change, and replay.
            </p>
            <div>
              <span>5</span> modules
              <i />
              <span>20+</span> interactions
              <i />
              beginner friendly
            </div>
          </div>
        </section>

        <section className="topic-grid" aria-label="Study modules">
          {TOPICS.map((topic) => (
            <button
              key={topic.id}
              className={`topic-card topic-${topic.color}`}
              onClick={() => onOpen(topic.id)}
            >
              <div className="topic-card-top">
                <span className="topic-number">{topic.number}</span>
                <span className="topic-icon">{topic.icon}</span>
              </div>
              <div className="topic-card-copy">
                <small>{topic.meta}</small>
                <h2>{topic.title}</h2>
                <p>{topic.description}</p>
              </div>
              <div className="topic-open">
                Open study canvas <ArrowRight size={17} />
              </div>
            </button>
          ))}
        </section>

        <section className="learning-loop">
          <span>How to use the studio</span>
          <div>
            <article>
              <i>1</i>
              <strong>Predict</strong>
              <p>Pause before clicking and guess what the system will do.</p>
            </article>
            <ArrowRight />
            <article>
              <i>2</i>
              <strong>Interact</strong>
              <p>Change one variable and watch the design react.</p>
            </article>
            <ArrowRight />
            <article>
              <i>3</i>
              <strong>Explain</strong>
              <p>Say the trade-off aloud in your own words.</p>
            </article>
          </div>
        </section>
      </main>
    </div>
  )
}

export default function StudyHub() {
  const [topic, setTopic] = useState<TopicId>(topicFromHash)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    const onHashChange = () => setTopic(topicFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  function openTopic(nextTopic: TopicId) {
    setTopic(nextTopic)
    setDrawerOpen(false)
    window.history.pushState(null, '', nextTopic === 'library' ? window.location.pathname : `#${nextTopic}`)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  return (
    <div className="study-hub">
      {topic === 'library' && <Library onOpen={openTopic} />}
      {topic === 'hashing' && <HashingCanvas />}
      {topic === 'rate-limiter' && <RateLimiterModule />}
      {topic === 'key-value' && <KeyValueModule />}
      {topic === 'estimation' && <EstimationModule />}
      {topic === 'math' && <MathPracticeModule />}

      {topic !== 'library' && (
        <button className="library-launcher" onClick={() => setDrawerOpen(true)}>
          <Menu size={17} />
          <span>Study library</span>
          <ChevronDown size={14} />
        </button>
      )}

      {drawerOpen && (
        <div className="topic-drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <aside className="topic-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="drawer-heading">
              <div>
                <small>System Design Studio</small>
                <h2>Choose a module</h2>
              </div>
              <button aria-label="Close library" onClick={() => setDrawerOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <button className="drawer-home" onClick={() => openTopic('library')}>
              <BookOpen size={18} /> Library home <ArrowRight size={15} />
            </button>
            <div className="drawer-topics">
              {TOPICS.map((item) => (
                <button
                  key={item.id}
                  className={topic === item.id ? 'current' : ''}
                  onClick={() => openTopic(item.id)}
                >
                  <span className={`drawer-topic-icon topic-${item.color}`}>{item.icon}</span>
                  <span>
                    <small>{item.number}</small>
                    <strong>{item.title}</strong>
                  </span>
                  <ArrowRight size={15} />
                </button>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
