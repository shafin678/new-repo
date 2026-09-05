import {
  ArrowRight,
  Calculator,
  Check,
  Clock3,
  Database,
  Gauge,
  HardDrive,
  MemoryStick,
  Network,
  Pencil,
  Ruler,
  Server,
  Sigma,
  Timer,
  TriangleAlert,
  Users,
  Zap,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { ConceptNote, ModuleSection, ModuleShell, SectionIntro } from './ModuleScaffold'

const SECTIONS: ModuleSection[] = [
  { id: 'estimate-powers', label: 'Powers & units' },
  { id: 'estimate-latency', label: 'Latency intuition' },
  { id: 'estimate-availability', label: 'Availability' },
  { id: 'estimate-capacity', label: 'QPS & storage' },
  { id: 'estimate-process', label: 'Interview process' },
]

const POWER_UNITS: Record<number, [string, string]> = {
  10: ['thousand', 'KiB'],
  20: ['million', 'MiB'],
  30: ['billion', 'GiB'],
  40: ['trillion', 'TiB'],
  50: ['quadrillion', 'PiB'],
}

const LATENCIES = [
  { id: 'l1', name: 'L1 cache reference', ns: 0.5, group: 'CPU' },
  { id: 'branch', name: 'Branch mispredict', ns: 5, group: 'CPU' },
  { id: 'l2', name: 'L2 cache reference', ns: 7, group: 'CPU' },
  { id: 'mutex', name: 'Mutex lock / unlock', ns: 100, group: 'CPU' },
  { id: 'memory', name: 'Read 1 MB from memory', ns: 250_000, group: 'Memory' },
  { id: 'dc', name: 'Same-datacenter round trip', ns: 500_000, group: 'Network' },
  { id: 'seek', name: 'Disk seek', ns: 10_000_000, group: 'Disk' },
  { id: 'network', name: 'Read 1 MB over network', ns: 10_000_000, group: 'Network' },
  { id: 'disk', name: 'Read 1 MB from disk', ns: 30_000_000, group: 'Disk' },
  { id: 'wan', name: 'California ↔ Netherlands', ns: 150_000_000, group: 'Network' },
]

function humanTime(ns: number) {
  if (ns >= 1_000_000_000) return `${(ns / 1_000_000_000).toFixed(2)} s`
  if (ns >= 1_000_000) return `${(ns / 1_000_000).toFixed(ns % 1_000_000 ? 2 : 0)} ms`
  if (ns >= 1_000) return `${(ns / 1_000).toFixed(ns % 1_000 ? 2 : 0)} μs`
  return `${ns} ns`
}

function PowersLab() {
  const [power, setPower] = useState(20)
  const exact = 2n ** BigInt(power)
  const [approximation, unit] = POWER_UNITS[power]
  const decimalBase = 10n ** BigInt(power / 10 * 3)
  const difference = Number((exact * 10_000n) / decimalBase) / 100 - 100
  return (
    <div className="powers-lab">
      <div className="power-control">
        <div>
          <small>Move the exponent</small>
          <strong>
            2<sup>{power}</sup>
          </strong>
        </div>
        <input
          type="range"
          min="10"
          max="50"
          step="10"
          value={power}
          onChange={(event) => setPower(Number(event.target.value))}
        />
        <div className="power-ticks">
          {[10, 20, 30, 40, 50].map((tick) => (
            <button className={power === tick ? 'active' : ''} key={tick} onClick={() => setPower(tick)}>
              2<sup>{tick}</sup>
            </button>
          ))}
        </div>
      </div>
      <div className="power-result">
        <div>
          <span>Exact binary count</span>
          <strong>{exact.toLocaleString()}</strong>
        </div>
        <ArrowRight />
        <div>
          <span>Useful approximation</span>
          <strong>
            ≈ 1 {approximation}
          </strong>
          <small>1 {unit}</small>
        </div>
      </div>
      <ConceptNote title={`Binary ${unit} is ${difference.toFixed(2)}% above its decimal cousin`} tone="warning">
        The source uses KB/MB/GB for powers of two. Strictly, 2<sup>10</sup> bytes is 1 KiB, while 1 KB is exactly
        1,000 bytes. State which convention you use.
      </ConceptNote>
    </div>
  )
}

function LatencyLab() {
  const [selected, setSelected] = useState<string[]>(['l2', 'mutex', 'memory', 'dc'])
  const total = LATENCIES.filter((item) => selected.includes(item.id)).reduce((sum, item) => sum + item.ns, 0)
  return (
    <div className="latency-lab">
      <div className="latency-toolbar">
        <div>
          <small>Historical reference numbers</small>
          <h3>Build a request path</h3>
        </div>
        <div className="latency-total">
          <span>Selected total</span>
          <strong>{humanTime(total)}</strong>
        </div>
      </div>
      <div className="latency-list">
        {LATENCIES.map((item) => {
          const isSelected = selected.includes(item.id)
          const width = Math.max(2, ((Math.log10(item.ns + 1) + 0.3) / 8.5) * 100)
          return (
            <button
              className={isSelected ? 'selected' : ''}
              key={item.id}
              onClick={() =>
                setSelected((current) =>
                  current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id],
                )
              }
            >
              <i>{isSelected && <Check size={13} />}</i>
              <span className="latency-name">
                <strong>{item.name}</strong>
                <small>{item.group}</small>
              </span>
              <span className="latency-bar">
                <i style={{ width: `${width}%` }} />
              </span>
              <code>{humanTime(item.ns)}</code>
            </button>
          )
        })}
      </div>
      <div className="latency-lessons">
        <span>
          <MemoryStick /> Memory is fast
        </span>
        <span>
          <HardDrive /> Seeks are expensive
        </span>
        <span>
          <Network /> Regions are far apart
        </span>
      </div>
      <p className="historical-note">
        These are intuition-building historical numbers, not promises about your hardware. Benchmark the real system
        before making a production decision.
      </p>
    </div>
  )
}

const AVAILABILITY_OPTIONS = [99, 99.9, 99.99, 99.999, 99.9999]

function AvailabilityLab() {
  const [availability, setAvailability] = useState(99.9)
  const dailySeconds = 86_400 * (1 - availability / 100)
  const yearlySeconds = 365.25 * 86_400 * (1 - availability / 100)
  return (
    <div className="availability-lab">
      <div className="nines-selector">
        {AVAILABILITY_OPTIONS.map((option) => (
          <button
            key={option}
            className={availability === option ? 'active' : ''}
            onClick={() => setAvailability(option)}
          >
            {option}%
          </button>
        ))}
      </div>
      <div className="availability-result">
        <div className="availability-ring" style={{ '--uptime': `${availability}%` } as React.CSSProperties}>
          <div>
            <strong>{availability}%</strong>
            <span>uptime</span>
          </div>
        </div>
        <div className="downtime-cards">
          <article>
            <Clock3 />
            <span>Downtime budget / day</span>
            <strong>{humanTime(dailySeconds * 1_000_000_000)}</strong>
          </article>
          <article>
            <Timer />
            <span>Downtime budget / year</span>
            <strong>{humanTime(yearlySeconds * 1_000_000_000)}</strong>
          </article>
        </div>
      </div>
      <div className="availability-formula">
        downtime = period × (1 − {availability} / 100)
      </div>
      <ConceptNote title="An SLA is a budget, not an architecture">
        More nines require redundancy, safe deployment, monitoring, repair, and operational discipline. Planned
        maintenance and measurement windows must also be defined.
      </ConceptNote>
    </div>
  )
}

function CapacityLab() {
  const [mau, setMau] = useState(300)
  const [dailyPercent, setDailyPercent] = useState(50)
  const [posts, setPosts] = useState(2)
  const [mediaPercent, setMediaPercent] = useState(10)
  const [retention, setRetention] = useState(5)
  const [replicas, setReplicas] = useState(1)
  const metrics = useMemo(() => {
    const dauM = mau * (dailyPercent / 100)
    const postsPerDayM = dauM * posts
    const qps = (postsPerDayM * 1_000_000) / 86_400
    const mediaTBPerDay = postsPerDayM * (mediaPercent / 100)
    const retainedPB = (mediaTBPerDay * 365 * retention * replicas) / 1_000
    return { dauM, postsPerDayM, qps, mediaTBPerDay, retainedPB }
  }, [mau, dailyPercent, posts, mediaPercent, retention, replicas])

  return (
    <div className="capacity-lab">
      <div className="assumption-panel">
        <span className="assumption-title">
          <Pencil size={16} /> Change the assumptions
        </span>
        {[
          ['Monthly users', mau, setMau, 50, 1000, 50, `${mau}M`],
          ['Daily active', dailyPercent, setDailyPercent, 10, 100, 5, `${dailyPercent}%`],
          ['Posts / user / day', posts, setPosts, 1, 10, 1, `${posts}`],
          ['Posts with media', mediaPercent, setMediaPercent, 0, 100, 5, `${mediaPercent}%`],
          ['Retention', retention, setRetention, 1, 10, 1, `${retention}y`],
          ['Replica factor', replicas, setReplicas, 1, 5, 1, `${replicas}×`],
        ].map(([label, value, setter, min, max, step, display]) => (
          <label key={label as string}>
            <span>
              {label as string} <strong>{display as string}</strong>
            </span>
            <input
              type="range"
              min={min as number}
              max={max as number}
              step={step as number}
              value={value as number}
              onChange={(event) => (setter as (next: number) => void)(Number(event.target.value))}
            />
          </label>
        ))}
      </div>
      <div className="capacity-results">
        <div className="capacity-formula">
          <span>
            <Users /> DAU
          </span>
          <code>
            {mau}M × {dailyPercent}%
          </code>
          <strong>{metrics.dauM.toFixed(0)}M</strong>
        </div>
        <div className="capacity-formula">
          <span>
            <Gauge /> Average QPS
          </span>
          <code>{metrics.postsPerDayM.toFixed(0)}M / 86,400</code>
          <strong>{Math.round(metrics.qps).toLocaleString()}</strong>
        </div>
        <div className="capacity-formula">
          <span>
            <Zap /> Peak QPS
          </span>
          <code>average × 2</code>
          <strong>{Math.round(metrics.qps * 2).toLocaleString()}</strong>
        </div>
        <div className="capacity-formula">
          <span>
            <Database /> Media / day
          </span>
          <code>{metrics.postsPerDayM.toFixed(0)}M × {mediaPercent}% × 1 MB</code>
          <strong>{metrics.mediaTBPerDay.toFixed(1)} TB</strong>
        </div>
        <div className="capacity-formula featured">
          <span>
            <Server /> Retained media
          </span>
          <code>daily × 365 × {retention} years × {replicas} replicas</code>
          <strong>{metrics.retainedPB.toFixed(2)} PB</strong>
        </div>
      </div>
      <ConceptNote title="The source defaults reproduce ≈3,500 QPS, 7,000 peak, 30 TB/day, and 55 PB">
        This intentionally simplified result excludes metadata, indexes, thumbnails, growth, compression, deletes,
        and replication unless you increase the replica factor.
      </ConceptNote>
    </div>
  )
}

export default function EstimationModule() {
  return (
    <ModuleShell
      code="04"
      title="Back-of-the-Envelope Estimation"
      subtitle="Turn vague scale into useful numbers—with explicit assumptions, labeled units, and sensible rounding."
      color="#d78b24"
      icon={<Calculator size={29} />}
      sections={SECTIONS}
    >
      <section className="module-section" id="estimate-powers">
        <SectionIntro eyebrow="01 · Powers & units" title="Big systems still begin with bytes">
          One byte is eight bits. Powers of two provide fast memory intuition; decimal approximations keep interview
          arithmetic manageable.
        </SectionIntro>
        <PowersLab />
      </section>

      <section className="module-section dark-module-section" id="estimate-latency">
        <SectionIntro eyebrow="02 · Latency intuition" title="A nanosecond and a millisecond are worlds apart">
          Select operations to build a path. The bars use a logarithmic scale because the slowest operation is hundreds
          of millions of times slower than the fastest.
        </SectionIntro>
        <LatencyLab />
      </section>

      <section className="module-section" id="estimate-availability">
        <SectionIntro eyebrow="03 · Availability" title="Every nine buys a smaller failure budget">
          Availability is the proportion of time a service is operational. Convert the percentage into downtime you
          can reason about.
        </SectionIntro>
        <AvailabilityLab />
      </section>

      <section className="module-section module-tint" id="estimate-capacity">
        <SectionIntro eyebrow="04 · QPS & storage" title="Rebuild the Twitter estimate yourself">
          Start from users, behavior, object size, and retention. Each output keeps its unit so dimensional mistakes
          are visible.
        </SectionIntro>
        <CapacityLab />
      </section>

      <section className="module-section" id="estimate-process">
        <SectionIntro eyebrow="05 · Interview process" title="A useful estimate is an argument you can inspect">
          Precision is not the goal. Clear assumptions and units let an interviewer follow, challenge, and adjust your
          reasoning.
        </SectionIntro>
        <div className="estimation-rules">
          {[
            [<Ruler />, 'Label every unit', 'Write 5 MB, not 5. Units catch impossible equations.'],
            [<Sigma />, 'Round deliberately', '99,987 ÷ 9.1 can become 100,000 ÷ 10 ≈ 10,000.'],
            [<Pencil />, 'Write assumptions', 'User activity, peak factor, retention, and replicas must be visible.'],
            [<TriangleAlert />, 'Name omissions', 'Indexes, protocol overhead, growth, compression, and failures may matter.'],
            [<Calculator />, 'Show the path', 'The process is more valuable than a suspiciously precise final number.'],
            [<Check />, 'Sanity-check', 'Compare orders of magnitude and ask whether the result passes common sense.'],
          ].map(([icon, title, copy]) => (
            <article key={title as string}>
              <span>{icon}</span>
              <strong>{title}</strong>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>
    </ModuleShell>
  )
}
