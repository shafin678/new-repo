import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Database,
  Gauge,
  Hash,
  Info,
  Layers3,
  Lightbulb,
  MousePointer2,
  Network,
  Play,
  RotateCcw,
  Server,
  ShieldAlert,
  Sparkles,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { TheoryNotebook } from './modules/ModuleScaffold'

type RingNode = {
  id: string
  label: string
  value: number
  color: string
  realId?: string
}

type RingKey = {
  id: string
  label: string
  value: number
}

const COLORS = ['#6856e8', '#10a37f', '#f29e4c', '#e4568f', '#2c88d9']

const LESSONS = [
  { id: 'why', short: 'The problem', eyebrow: '01 · Why it exists' },
  { id: 'ring', short: 'The hash ring', eyebrow: '02 · Build the idea' },
  { id: 'lookup', short: 'Find a server', eyebrow: '03 · Follow a key' },
  { id: 'changes', short: 'Add & remove', eyebrow: '04 · Safely resize' },
  { id: 'virtual', short: 'Virtual nodes', eyebrow: '05 · Balance the load' },
  { id: 'check', short: 'Knowledge check', eyebrow: '06 · Make it stick' },
]

const BASIC_SERVERS: RingNode[] = [
  { id: 's0', label: 'S0', value: 45, color: COLORS[0] },
  { id: 's1', label: 'S1', value: 135, color: COLORS[1] },
  { id: 's2', label: 'S2', value: 225, color: COLORS[3] },
  { id: 's3', label: 'S3', value: 315, color: COLORS[2] },
]

const BASIC_KEYS: RingKey[] = [
  { id: 'key0', label: 'key0', value: 18 },
  { id: 'key1', label: 'key1', value: 108 },
  { id: 'key2', label: 'key2', value: 198 },
  { id: 'key3', label: 'key3', value: 288 },
]

function hashString(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619) >>> 0
  }
  return hash
}

function ringHash(value: string) {
  let hash = hashString(value)
  hash ^= hash >>> 16
  hash = Math.imul(hash, 0x85ebca6b) >>> 0
  hash ^= hash >>> 13
  hash = Math.imul(hash, 0xc2b2ae35) >>> 0
  hash ^= hash >>> 16
  return hash >>> 0
}

function findOwner(keyValue: number, nodes: RingNode[]) {
  const sorted = [...nodes].sort((a, b) => a.value - b.value)
  return sorted.find((node) => node.value >= keyValue) ?? sorted[0]
}

function polarPoint(value: number, radius: number, center = 200) {
  const angle = (value / 360) * Math.PI * 2 - Math.PI / 2
  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
  }
}

function clockwiseArc(start: number, end: number, radius: number) {
  const from = polarPoint(start, radius)
  const to = polarPoint(end, radius)
  const delta = (end - start + 360) % 360
  return `M ${from.x} ${from.y} A ${radius} ${radius} 0 ${delta > 180 ? 1 : 0} 1 ${to.x} ${to.y}`
}

function scrollToLesson(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function Pill({ children, tone = 'purple' }: { children: React.ReactNode; tone?: 'purple' | 'green' | 'orange' }) {
  return <span className={`pill pill-${tone}`}>{children}</span>
}

function LessonHeader({
  lesson,
  title,
  description,
}: {
  lesson: number
  title: string
  description: string
}) {
  return (
    <header className="lesson-header">
      <p className="eyebrow">{LESSONS[lesson].eyebrow}</p>
      <h2>{title}</h2>
      <p>{description}</p>
    </header>
  )
}

function NextLesson({ index, label }: { index: number; label: string }) {
  if (index >= LESSONS.length - 1) return null
  return (
    <button className="next-lesson" onClick={() => scrollToLesson(LESSONS[index + 1].id)}>
      <span>
        <small>Up next</small>
        {label}
      </span>
      <ArrowRight size={18} />
    </button>
  )
}

function ModuloDemo() {
  const [failed, setFailed] = useState(false)
  const originalPool = [0, 1, 2, 3]
  const reducedPool = [0, 2, 3]
  const activePool = failed ? reducedPool : originalPool
  const keys = Array.from({ length: 8 }, (_, index) => {
    const name = `key${index}`
    const hash = hashString(name)
    const beforeIndex = hash % originalPool.length
    const afterIndex = hash % reducedPool.length
    return {
      name,
      hash,
      beforeIndex,
      afterIndex,
      beforeOwner: originalPool[beforeIndex],
      afterOwner: reducedPool[afterIndex],
    }
  })
  const moved = keys.filter((key) => key.beforeOwner !== key.afterOwner).length
  const serverCount = activePool.length

  return (
    <div className="demo-card modulo-demo">
      <div className="demo-toolbar">
        <div>
          <span className="demo-label">Try it</span>
          <h3>Modulo machine</h3>
        </div>
        <button className={`toggle-button ${failed ? 'danger' : ''}`} onClick={() => setFailed((value) => !value)}>
          {failed ? <RotateCcw size={16} /> : <ShieldAlert size={16} />}
          {failed ? 'Restore server 1' : 'Take server 1 offline'}
        </button>
      </div>

      <div className="formula-strip">
        <span>server index</span>
        <strong>hash(key) % {serverCount}</strong>
        <span className="formula-caption">{serverCount} available servers</span>
      </div>

      <div className="server-columns" style={{ '--columns': serverCount } as React.CSSProperties}>
        {activePool.map((server, poolIndex) => (
          <div className="server-column" key={server}>
            <div className="server-head">
              <Server size={16} />
              Server {server}
            </div>
            <div className="key-stack">
              {keys
                .filter((key) => (failed ? key.afterIndex : key.beforeIndex) === poolIndex)
                .map((key) => {
                  const hasMoved = failed && key.beforeOwner !== key.afterOwner
                  return (
                    <div className={`key-chip ${hasMoved ? 'moved' : ''}`} key={key.name}>
                      <span>{key.name}</span>
                      {hasMoved && <ArrowRight size={12} />}
                      {hasMoved && <small>was S{key.beforeOwner}</small>}
                    </div>
                  )
                })}
            </div>
          </div>
        ))}
      </div>

      <div className={`result-banner ${failed ? 'bad' : 'neutral'}`}>
        {failed ? (
          <>
            <Zap size={18} />
            <span>
              <strong>{moved} of 8 keys moved.</strong> Their hash did not change—the divisor did. Cache clients now look
              in the wrong places, causing a cache-miss storm.
            </span>
          </>
        ) : (
          <>
            <CheckCircle2 size={18} />
            <span>
              This is simple and balanced while <strong>N stays fixed</strong>. Now remove one server to reveal the
              problem.
            </span>
          </>
        )}
      </div>
    </div>
  )
}

function RingDiagram({
  nodes,
  keys,
  selectedKey,
  onSelectKey,
  compact = false,
  showPartitions = true,
}: {
  nodes: RingNode[]
  keys: RingKey[]
  selectedKey?: string
  onSelectKey?: (key: string) => void
  compact?: boolean
  showPartitions?: boolean
}) {
  const sorted = [...nodes].sort((a, b) => a.value - b.value)
  const selected = keys.find((key) => key.id === selectedKey)
  const selectedOwner = selected ? findOwner(selected.value, nodes) : undefined
  const circumference = 2 * Math.PI * 144

  return (
    <div className={`ring-wrap ${compact ? 'compact' : ''}`}>
      <svg className="ring-svg" viewBox="0 0 400 400" role="img" aria-label="Interactive consistent hash ring">
        <defs>
          <filter id="soft-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity=".16" />
          </filter>
          <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#27253b" />
          </marker>
        </defs>

        <circle cx="200" cy="200" r="144" className="ring-base" />
        {showPartitions &&
          sorted.map((node, index) => {
            const previous = sorted[(index - 1 + sorted.length) % sorted.length]
            const delta = (node.value - previous.value + 360) % 360
            const length = (delta / 360) * circumference
            return (
              <circle
                key={`partition-${node.id}`}
                cx="200"
                cy="200"
                r="144"
                fill="none"
                stroke={node.color}
                strokeWidth="10"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-(previous.value / 360) * circumference}
                transform="rotate(-90 200 200)"
                opacity=".32"
              />
            )
          })}

        {selected && selectedOwner && (
          <path
            d={clockwiseArc(selected.value, selectedOwner.value, 122)}
            className="lookup-arc"
            markerEnd="url(#arrowhead)"
          />
        )}

        <g className="center-note">
          <text x="200" y="189" textAnchor="middle">
            HASH SPACE
          </text>
          <text x="200" y="212" textAnchor="middle">
            0 → 359
          </text>
          {selected && selectedOwner && (
            <text x="200" y="238" textAnchor="middle" className="owner-note">
              {selected.label} → {selectedOwner.realId ?? selectedOwner.label}
            </text>
          )}
        </g>

        {keys.map((key) => {
          const point = polarPoint(key.value, 122)
          const isSelected = key.id === selectedKey
          return (
            <g
              key={key.id}
              className={`ring-key ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectKey?.(key.id)}
              role={onSelectKey ? 'button' : undefined}
              aria-label={onSelectKey ? `Trace ${key.label}` : undefined}
              tabIndex={onSelectKey ? 0 : undefined}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') onSelectKey?.(key.id)
              }}
            >
              <circle cx={point.x} cy={point.y} r={isSelected ? 13 : 10} />
              <text x={point.x} y={point.y + 3.5} textAnchor="middle">
                {key.label.replace('key', 'k')}
              </text>
            </g>
          )
        })}

        {nodes.map((node) => {
          const point = polarPoint(node.value, 144)
          return (
            <g key={node.id} className="ring-node" filter="url(#soft-shadow)">
              <circle cx={point.x} cy={point.y} r={compact ? 8 : 15} fill={node.color} />
              {!compact && (
                <text x={point.x} y={point.y + 4} textAnchor="middle">
                  {node.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <div className="clockwise-badge">
        <RotateCcw size={14} />
        clockwise
      </div>
    </div>
  )
}

function HashSpaceDemo() {
  const [folded, setFolded] = useState(false)
  return (
    <div className="demo-card hash-space-demo">
      <div className="demo-toolbar">
        <div>
          <span className="demo-label">One big idea</span>
          <h3>A line whose ends touch</h3>
        </div>
        <button className="primary-button" onClick={() => setFolded((value) => !value)}>
          {folded ? <RotateCcw size={16} /> : <Play size={16} />}
          {folded ? 'Unroll it' : 'Join the ends'}
        </button>
      </div>
      <div className={`space-visual ${folded ? 'is-folded' : ''}`}>
        {folded ? (
          <div className="mini-ring">
            <span className="zero-mark">0</span>
            <span className="max-mark">2¹⁶⁰ − 1</span>
            <Hash size={36} />
          </div>
        ) : (
          <div className="number-line">
            <span>0</span>
            <i />
            <b>hash outputs live somewhere here</b>
            <i />
            <span>2¹⁶⁰ − 1</span>
          </div>
        )}
      </div>
      <p className="plain-explanation">
        A hash function turns a name like <code>server-2</code> or <code>photo.jpg</code> into a number. SHA-1 has
        2<sup>160</sup> possible numbers. Joining the smallest and largest ends gives us a ring—like wrapping a ruler
        into a bracelet.
      </p>
    </div>
  )
}

function LookupDemo() {
  const [selected, setSelected] = useState('key0')
  const current = BASIC_KEYS.find((key) => key.id === selected)!
  const owner = findOwner(current.value, BASIC_SERVERS)

  return (
    <div className="demo-card lookup-demo">
      <div className="demo-toolbar">
        <div>
          <span className="demo-label">Interactive canvas</span>
          <h3>Pick a key. Follow the arrow.</h3>
        </div>
        <div className="hint">
          <MousePointer2 size={15} />
          Tap any white key
        </div>
      </div>
      <div className="lookup-layout">
        <RingDiagram
          nodes={BASIC_SERVERS}
          keys={BASIC_KEYS}
          selectedKey={selected}
          onSelectKey={setSelected}
        />
        <div className="lookup-steps">
          <div className="trace-summary">
            <div className="key-token">{current.label}</div>
            <ArrowRight size={20} />
            <div className="server-token" style={{ '--server-color': owner.color } as React.CSSProperties}>
              {owner.label}
            </div>
          </div>
          <ol>
            <li>
              <span>1</span>
              Hash the key to position <strong>{current.value}</strong>.
            </li>
            <li>
              <span>2</span>
              Walk <strong>clockwise</strong>.
            </li>
            <li>
              <span>3</span>
              Stop at the first server: <strong>{owner.label}</strong>.
            </li>
          </ol>
          <div className="wrap-note">
            <Info size={17} />
            If there is no server ahead, wrap past 359 back to 0. That is why the ring matters.
          </div>
        </div>
      </div>
    </div>
  )
}

function ChangesDemo() {
  const [scenario, setScenario] = useState<'base' | 'add' | 'remove'>('base')
  const nodes =
    scenario === 'add'
      ? [...BASIC_SERVERS, { id: 's4', label: 'S4', value: 31, color: COLORS[4] }]
      : scenario === 'remove'
        ? BASIC_SERVERS.filter((server) => server.id !== 's1')
        : BASIC_SERVERS

  const movedKeys = BASIC_KEYS.filter(
    (key) => findOwner(key.value, BASIC_SERVERS).id !== findOwner(key.value, nodes).id,
  )

  return (
    <div className="demo-card changes-demo">
      <div className="scenario-tabs" role="tablist" aria-label="Server change scenario">
        {[
          ['base', 'Original ring'],
          ['add', '+ Add S4'],
          ['remove', '− Remove S1'],
        ].map(([value, label]) => (
          <button
            key={value}
            className={scenario === value ? 'active' : ''}
            onClick={() => setScenario(value as typeof scenario)}
            role="tab"
            aria-selected={scenario === value}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="changes-layout">
        <RingDiagram nodes={nodes} keys={BASIC_KEYS} selectedKey={movedKeys[0]?.id} />
        <div className="change-story">
          {scenario === 'base' ? (
            <>
              <Pill>Starting point</Pill>
              <h3>Four equal examples</h3>
              <p>Each sample key walks clockwise to a server. Choose a change above to resize the cluster.</p>
              <div className="movement-score neutral-score">
                <strong>0</strong>
                <span>keys moving right now</span>
              </div>
            </>
          ) : (
            <>
              <Pill tone={scenario === 'add' ? 'green' : 'orange'}>
                {scenario === 'add' ? 'Server added' : 'Server removed'}
              </Pill>
              <h3>{scenario === 'add' ? 'Only key0 changes owner' : 'Only key1 changes owner'}</h3>
              <p>
                {scenario === 'add'
                  ? 'S4 takes only the slice immediately before it—from S3 (exclusive) to S4 (inclusive).'
                  : 'S1’s slice is handed to the next clockwise server, S2. Every other slice stays put.'}
              </p>
              <div className="movement-score good-score">
                <strong>{movedKeys.length}</strong>
                <span>of {BASIC_KEYS.length} sample keys remapped</span>
              </div>
              <div className="range-rule">
                <ArrowDown size={17} />
                <span>
                  To find affected data, move <strong>anticlockwise</strong> from the changed node to the previous
                  server. That interval is the only range to move.
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function VirtualNodeDemo() {
  const [replicas, setReplicas] = useState(1)
  const serverNames = ['Atlas', 'Birch', 'Cedar']
  const keys = useMemo(
    () =>
      Array.from({ length: 180 }, (_, index) => ({
        id: `item-${index}`,
        label: '',
        value: ringHash(`customer-record-${index}`) % 360,
      })),
    [],
  )
  const nodes = useMemo(
    () =>
      serverNames.flatMap((server, serverIndex) =>
        Array.from({ length: replicas }, (_, replica) => ({
          id: `${server}-${replica}`,
          label: '',
          realId: server,
          value: ringHash(`${server}:virtual-node:${replica}`) % 360,
          color: COLORS[serverIndex],
        })),
      ),
    [replicas],
  )
  const counts = serverNames.map((name) => keys.filter((key) => findOwner(key.value, nodes).realId === name).length)
  const mean = keys.length / serverNames.length
  const deviation = Math.sqrt(counts.reduce((sum, count) => sum + (count - mean) ** 2, 0) / counts.length)
  const deviationPercent = Math.round((deviation / mean) * 100)

  return (
    <div className="demo-card vnode-demo">
      <div className="demo-toolbar vnode-toolbar">
        <div>
          <span className="demo-label">Balance lab</span>
          <h3>Give each server more seats on the ring</h3>
        </div>
        <div className="replica-readout">
          <strong>{replicas}</strong>
          <span>virtual {replicas === 1 ? 'node' : 'nodes'} / server</span>
        </div>
      </div>

      <label className="slider-label">
        <span>Fewer</span>
        <input
          type="range"
          min="1"
          max="24"
          value={replicas}
          onChange={(event) => setReplicas(Number(event.target.value))}
          aria-label="Virtual nodes per server"
        />
        <span>More</span>
      </label>

      <div className="vnode-layout">
        <RingDiagram nodes={nodes} keys={[]} compact />
        <div className="distribution-panel">
          <div className="balance-header">
            <div>
              <small>Spread score</small>
              <strong className={deviationPercent < 10 ? 'balanced' : ''}>±{deviationPercent}%</strong>
            </div>
            <Gauge size={28} />
          </div>
          <p>
            Standard deviation from the ideal average of {mean} keys per server. Individual steps can wiggle; the
            overall trend improves as samples increase.
          </p>
          <div className="bar-chart">
            {serverNames.map((server, index) => (
              <div className="bar-row" key={server}>
                <span>{server}</span>
                <div className="bar-track">
                  <i
                    style={{
                      width: `${Math.max(6, (counts[index] / Math.max(...counts)) * 100)}%`,
                      background: COLORS[index],
                    }}
                  />
                </div>
                <strong>{counts[index]}</strong>
              </div>
            ))}
          </div>
          <div className="tradeoff-note">
            <Layers3 size={18} />
            <span>
              More virtual nodes usually improve balance, but consume more metadata and make ring management heavier.
              Real systems tune this trade-off.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

const QUIZ = [
  {
    question: 'A key lands at position 70. Servers are at 20, 90, and 250. Which server owns it?',
    options: ['Server at 20', 'Server at 90', 'Server at 250'],
    answer: 1,
    explanation: 'Walk clockwise from 70. The first server encountered is at 90.',
  },
  {
    question: 'When one server is added to a consistent hash ring, what should happen?',
    options: ['Nearly every key moves', 'Only keys in one affected range move', 'No keys ever move'],
    answer: 1,
    explanation: 'The new server takes the range between the previous server and itself.',
  },
  {
    question: 'Why use many virtual nodes for each physical server?',
    options: ['To encrypt the keys', 'To remove the hash function', 'To spread partitions more evenly'],
    answer: 2,
    explanation: 'Multiple positions give each real server several smaller slices, reducing imbalance.',
  },
]

function KnowledgeCheck() {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [revealed, setRevealed] = useState<Record<number, boolean>>({})
  const score = QUIZ.reduce((total, quiz, index) => total + (answers[index] === quiz.answer ? 1 : 0), 0)
  const complete = Object.keys(revealed).length === QUIZ.length

  function reset() {
    setAnswers({})
    setRevealed({})
  }

  return (
    <div className="quiz-shell">
      <div className="quiz-topline">
        <div>
          <span className="demo-label">Three quick questions</span>
          <h3>{complete ? `You scored ${score} / ${QUIZ.length}` : 'Check your mental model'}</h3>
        </div>
        {complete && (
          <button className="ghost-button" onClick={reset}>
            <RotateCcw size={15} /> Try again
          </button>
        )}
      </div>
      <div className="quiz-list">
        {QUIZ.map((quiz, quizIndex) => (
          <article className="quiz-card" key={quiz.question}>
            <span className="question-number">0{quizIndex + 1}</span>
            <h4>{quiz.question}</h4>
            <div className="quiz-options">
              {quiz.options.map((option, optionIndex) => {
                const isChosen = answers[quizIndex] === optionIndex
                const isCorrect = quiz.answer === optionIndex
                const isRevealed = revealed[quizIndex]
                return (
                  <button
                    key={option}
                    className={`${isChosen ? 'chosen' : ''} ${isRevealed && isCorrect ? 'correct' : ''} ${
                      isRevealed && isChosen && !isCorrect ? 'wrong' : ''
                    }`}
                    onClick={() => {
                      if (!isRevealed) setAnswers((current) => ({ ...current, [quizIndex]: optionIndex }))
                    }}
                    disabled={isRevealed}
                  >
                    <i>{String.fromCharCode(65 + optionIndex)}</i>
                    <span>{option}</span>
                    {isRevealed && isCorrect && <Check size={17} />}
                    {isRevealed && isChosen && !isCorrect && <X size={17} />}
                  </button>
                )
              })}
            </div>
            {!revealed[quizIndex] && answers[quizIndex] !== undefined && (
              <button
                className="check-button"
                onClick={() => setRevealed((current) => ({ ...current, [quizIndex]: true }))}
              >
                Check answer
              </button>
            )}
            {revealed[quizIndex] && (
              <p className={`answer-note ${answers[quizIndex] === quiz.answer ? 'right' : 'retry'}`}>
                {answers[quizIndex] === quiz.answer ? <CheckCircle2 size={17} /> : <Lightbulb size={17} />}
                {quiz.explanation}
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}

function App() {
  const [activeLesson, setActiveLesson] = useState(0)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) {
          const index = LESSONS.findIndex((lesson) => lesson.id === visible.target.id)
          if (index >= 0) setActiveLesson(index)
        }
      },
      { rootMargin: '-25% 0px -55%', threshold: [0.05, 0.25, 0.5] },
    )
    LESSONS.forEach((lesson) => {
      const element = document.getElementById(lesson.id)
      if (element) observer.observe(element)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <div className="app-shell">
      <aside className="lesson-rail">
        <button className="brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span>
            <Network size={21} />
          </span>
          <div>
            <strong>Hash Ring Lab</strong>
            <small>Interactive primer</small>
          </div>
        </button>
        <nav aria-label="Lessons">
          {LESSONS.map((lesson, index) => (
            <button
              key={lesson.id}
              className={activeLesson === index ? 'active' : ''}
              onClick={() => scrollToLesson(lesson.id)}
            >
              <i>{index + 1}</i>
              <span>{lesson.short}</span>
              {activeLesson > index && <Check size={13} />}
            </button>
          ))}
        </nav>
        <div className="rail-progress">
          <div>
            <span style={{ width: `${((activeLesson + 1) / LESSONS.length) * 100}%` }} />
          </div>
          <p>{Math.round(((activeLesson + 1) / LESSONS.length) * 100)}% explored</p>
        </div>
        <div className="source-note">
          <BookOpen size={16} />
          Adapted from Chapter 5, “Design Consistent Hashing.”
        </div>
      </aside>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <Pill tone="green">
              <Sparkles size={13} /> Beginner mode
            </Pill>
            <h1>
              Consistent hashing,
              <br />
              <em>finally visual.</em>
            </h1>
            <p>
              Learn how large systems decide where data lives—and why one small server change should not move
              everything.
            </p>
            <button className="hero-button" onClick={() => scrollToLesson('why')}>
              Start with the problem <ArrowDown size={17} />
            </button>
            <div className="time-note">
              <CircleHelp size={15} />
              No math background needed · 6 interactive lessons
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="hero-core">
              <Hash size={44} />
              <span>hash</span>
            </div>
            {[
              ['S0', 'server-dot server-purple'],
              ['S1', 'server-dot server-green'],
              ['S2', 'server-dot server-pink'],
              ['S3', 'server-dot server-orange'],
            ].map(([label, className]) => (
              <div className={className} key={label}>
                <Server size={15} />
                {label}
              </div>
            ))}
            <span className="floating-key key-a">key A</span>
            <span className="floating-key key-b">key B</span>
            <span className="floating-key key-c">key C</span>
          </div>
        </section>

        <section className="lesson-section" id="why">
          <LessonHeader
            lesson={0}
            title="First, see what breaks"
            description="Suppose a cache has four servers. A traditional formula looks wonderfully simple—until one server disappears."
          />
          <div className="concept-grid">
            <div className="concept-card">
              <Database size={22} />
              <h3>Horizontal scaling</h3>
              <p>Add more machines instead of buying one ever-larger machine. The data must be divided among them.</p>
            </div>
            <div className="concept-card">
              <Hash size={22} />
              <h3>Hash function</h3>
              <p>A repeatable machine: the same key always becomes the same large number.</p>
            </div>
            <div className="concept-card">
              <Server size={22} />
              <h3>Modulo (%)</h3>
              <p>The remainder picks a server index—but changing the server count changes most remainders.</p>
            </div>
          </div>
          <ModuloDemo />
          <div className="aha-card">
            <Lightbulb size={23} />
            <div>
              <strong>The real requirement</strong>
              <p>
                We want the mapping to stay stable when the cluster changes. With <em>k</em> keys and <em>n</em>{' '}
                slots, consistent hashing remaps about <em>k / n</em> keys on average—not nearly all of them.
              </p>
            </div>
          </div>
          <TheoryNotebook
            title="Consistent hashing foundations"
            intro="Use this notebook when you want the deeper reason behind the ring—not only the animation."
            topics={[
              {
                title: 'A hash function creates a repeatable location',
                plain:
                  'A hash function turns any key into a number. The same input produces the same output, so every client can independently calculate where to look.',
                analogy:
                  'A library catalog turns a book title into a repeatable shelf code. The code is not the book; it only helps find the correct area.',
                technical:
                  'Good distribution matters more here than cryptographic secrecy. Collisions are possible in a finite hash space, and production systems define how to handle them.',
                remember: 'Hashing chooses a location; it does not encrypt the key.',
              },
              {
                title: 'Modulo couples every key to the server count',
                plain:
                  'The formula hash(key) % N uses N as part of every assignment. When N changes, most remainders change even though every hash stays the same.',
                analogy:
                  'Numbering seats by “ticket number divided by today’s bus count” forces passengers to change buses whenever one bus leaves.',
                technical:
                  'Modulo partitioning works well for a fixed number of stable shards. The rehashing problem appears when physical membership changes directly alter N.',
                remember: 'The hash is stable; the divisor is what causes the reshuffle.',
              },
              {
                title: 'The ring removes the changing divisor',
                plain:
                  'Servers and keys receive positions in one fixed number space. Joining the largest number back to zero makes clockwise lookup wrap naturally.',
                analogy:
                  'People and pickup lockers are placed around a circular track. Walk forward from a package until the first locker.',
                technical:
                  'A server owns the interval after its previous server up to itself. The ring is a logical model; requests do not physically travel around a circle.',
                remember: 'Key → clockwise → first server.',
              },
              {
                title: 'A membership change affects one neighboring range',
                plain:
                  'A new server takes only the slice immediately before its position. A removed server gives its slice to the next clockwise server.',
                analogy:
                  'Opening a new post office changes only addresses in the nearby boundary area, not every address in the country.',
                technical:
                  'With k keys and n evenly distributed nodes, adding or removing one node moves roughly k/n keys on average. Actual movement depends on partition sizes.',
                remember: 'Find the previous server anticlockwise; that interval is the affected range.',
              },
              {
                title: 'One ring position per machine is too random',
                plain:
                  'Random server positions create unequal arcs. One machine may own a huge range while another owns almost nothing.',
                analogy:
                  'Giving each family one random piece of a pizza can produce one giant slice and several tiny slices.',
                technical:
                  'Key distribution follows partition length when hashes are uniform. Node removal can make an already-large neighboring partition even larger.',
                remember: 'Uniform hashing does not guarantee equal partitions in a small sample.',
              },
              {
                title: 'Virtual nodes average many small slices',
                plain:
                  'Each physical server appears at many positions on the ring. Its total responsibility becomes the sum of many smaller, scattered partitions.',
                analogy:
                  'Instead of one random pizza slice, each person receives many small slices from around the pizza; totals are more likely to be similar.',
                technical:
                  'More virtual nodes reduce load variance and can represent heterogeneous capacity, but increase metadata, movement planning, and operational complexity.',
                remember: 'Virtual nodes are labels pointing to real servers—not extra machines.',
              },
              {
                title: 'Balance, replication, and hot keys are separate',
                plain:
                  'The ring spreads many different keys. Replication creates extra copies for failure tolerance. A single extremely popular key can still overload its owner.',
                analogy:
                  'Evenly assigning books across librarians does not help if every visitor asks one librarian for the same bestseller.',
                technical:
                  'Mitigate hot popularity with caching, replication, request coalescing, key splitting, or dedicated handling. Use topology-aware replicas across failure domains.',
                remember: 'Consistent hashing balances ownership, not the popularity of one key.',
              },
            ]}
          />
          <NextLesson index={0} label="Turn the number line into a ring" />
        </section>

        <section className="lesson-section soft-section" id="ring">
          <LessonHeader
            lesson={1}
            title="Wrap the hash space into a ring"
            description="The ring is not a physical network. It is just a useful picture of every possible hash number, with the two ends joined."
          />
          <HashSpaceDemo />
          <div className="analogy-card">
            <div className="analogy-icon">
              <Network size={28} />
            </div>
            <div>
              <span className="demo-label">Think of it like assigned seating</span>
              <h3>Servers and keys receive seat numbers</h3>
              <p>
                Hash each server’s name or IP to place it on the ring. Hash every data key with the same hash space.
                There is no <code>% N</code> step, so adding a server does not renumber all existing seats.
              </p>
            </div>
          </div>
          <div className="steps-row">
            <div>
              <i>1</i>
              <strong>Hash servers</strong>
              <span>S0, S1, S2, S3 get ring positions.</span>
            </div>
            <ChevronRight />
            <div>
              <i>2</i>
              <strong>Hash keys</strong>
              <span>key0, key1… get positions too.</span>
            </div>
            <ChevronRight />
            <div>
              <i>3</i>
              <strong>Walk clockwise</strong>
              <span>The first server owns the key.</span>
            </div>
          </div>
          <NextLesson index={1} label="Trace a key to its server" />
        </section>

        <section className="lesson-section" id="lookup">
          <LessonHeader
            lesson={2}
            title="The one rule to remember"
            description="Start at the key. Move clockwise. Stop at the first server. That server stores—or is responsible for—the key."
          />
          <LookupDemo />
          <div className="definition-strip">
            <span>key position</span>
            <ChevronRight />
            <span>clockwise walk</span>
            <ChevronRight />
            <strong>first server</strong>
          </div>
          <NextLesson index={2} label="Watch what moves when servers change" />
        </section>

        <section className="lesson-section dark-section" id="changes">
          <LessonHeader
            lesson={3}
            title="Resize without the chaos"
            description="Adding or removing a server changes just one neighboring slice of the ring. Try both scenarios."
          />
          <ChangesDemo />
          <div className="compare-grid">
            <div>
              <span className="bad-dot" />
              <small>Modulo hashing</small>
              <strong>Most keys may move</strong>
              <p>The divisor N changed, so most assignments changed.</p>
            </div>
            <div>
              <span className="good-dot" />
              <small>Consistent hashing</small>
              <strong>One range moves</strong>
              <p>Only the changed server’s neighboring partition is affected.</p>
            </div>
          </div>
          <NextLesson index={3} label="Fix the basic ring’s imbalance" />
        </section>

        <section className="lesson-section" id="virtual">
          <LessonHeader
            lesson={4}
            title="One server needs more than one seat"
            description="Real hash positions are random. With one position per server, some servers can inherit huge slices while others get tiny ones."
          />
          <div className="issue-grid">
            <article>
              <span>Problem 1</span>
              <h3>Unequal partitions</h3>
              <p>Removing one node can leave its neighbor responsible for a much larger arc than everyone else.</p>
            </article>
            <article>
              <span>Problem 2</span>
              <h3>Uneven key distribution</h3>
              <p>Randomly clustered server positions can send most keys to one server and almost none to another.</p>
            </article>
          </div>
          <div className="vnode-explainer">
            <div className="physical-node">
              <Server size={22} />
              <strong>Physical server Atlas</strong>
            </div>
            <ArrowRight />
            <div className="virtual-cluster">
              <span>A₀</span>
              <span>A₁</span>
              <span>A₂</span>
              <span>…</span>
            </div>
            <p>Each virtual node points back to the same real machine.</p>
          </div>
          <VirtualNodeDemo />
          <div className="nuance-card">
            <Info size={21} />
            <div>
              <strong>A useful correction about “hot keys”</strong>
              <p>
                Consistent hashing spreads <em>many different keys</em> well. But one celebrity-level key still maps
                to one owner and can overload it. Fix that with replication, key splitting, or a dedicated cache—not
                the ring alone.
              </p>
            </div>
          </div>
          <NextLesson index={4} label="Test what you now know" />
        </section>

        <section className="lesson-section finish-section" id="check">
          <LessonHeader
            lesson={5}
            title="Make the idea stick"
            description="Use the clockwise rule and the affected-range rule. You already have everything you need."
          />
          <KnowledgeCheck />
          <div className="recap-card">
            <div className="recap-title">
              <Sparkles size={22} />
              <div>
                <small>The whole chapter in four lines</small>
                <h3>Your pocket summary</h3>
              </div>
            </div>
            <ol>
              <li>
                <span>1</span>
                Hash both servers and keys onto one circular number space.
              </li>
              <li>
                <span>2</span>
                A key belongs to the first server found clockwise.
              </li>
              <li>
                <span>3</span>
                A server change moves only the neighboring affected range.
              </li>
              <li>
                <span>4</span>
                Virtual nodes produce smaller, better-balanced partitions.
              </li>
            </ol>
          </div>
          <div className="real-world">
            <small>Used in real systems</small>
            <div>
              {['Amazon Dynamo', 'Apache Cassandra', 'Discord', 'Akamai CDN', 'Maglev'].map((name) => (
                <span key={name}>{name}</span>
              ))}
            </div>
          </div>
          <button className="back-to-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <ChevronLeft size={16} /> Revisit from the beginning
          </button>
        </section>

        <footer>
          <div className="footer-brand">
            <Network size={18} />
            <strong>Hash Ring Lab</strong>
          </div>
          <p>Built as an interactive companion to the supplied consistent hashing chapter.</p>
        </footer>
      </main>
    </div>
  )
}

export default App
