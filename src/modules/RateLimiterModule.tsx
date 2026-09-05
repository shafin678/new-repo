import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Check,
  Clock3,
  Cloud,
  Database,
  Gauge,
  LockKeyhole,
  Network,
  Pause,
  Play,
  RefreshCw,
  Server,
  ShieldCheck,
  SkipBack,
  StepForward,
  X,
  Zap,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { ConceptNote, ModuleSection, ModuleShell, SectionIntro, TheoryNotebook } from './ModuleScaffold'

type AlgorithmId = 'token' | 'leaky' | 'fixed' | 'log' | 'counter'
type Decision = 'accepted' | 'rejected' | 'queued' | 'processed'

type SimulationStep = {
  time: number
  request: string
  decision: Decision
  headline: string
  state: string
  formula?: string
  note: string
}

const SECTIONS: ModuleSection[] = [
  { id: 'rate-why', label: 'Purpose & scope' },
  { id: 'rate-algorithms', label: 'Algorithm lab' },
  { id: 'rate-architecture', label: 'Architecture' },
  { id: 'rate-distributed', label: 'Distributed limits' },
  { id: 'rate-recap', label: 'Decision guide' },
]

const ALGORITHMS: Record<
  AlgorithmId,
  { name: string; short: string; strength: string; cost: string; memory: string }
> = {
  token: {
    name: 'Token bucket',
    short: 'Tokens refill over time; each request spends one.',
    strength: 'Allows a controlled burst while enforcing a long-term rate.',
    cost: 'Capacity and refill rate must be tuned together.',
    memory: 'O(1)',
  },
  leaky: {
    name: 'Leaky bucket',
    short: 'A finite FIFO queue drains at a fixed speed.',
    strength: 'Produces a smooth, predictable output rate.',
    cost: 'Adds queue delay and can cause head-of-line blocking.',
    memory: 'O(queue)',
  },
  fixed: {
    name: 'Fixed window',
    short: 'One counter for each fixed block of time.',
    strength: 'Very simple and memory efficient.',
    cost: 'A boundary can admit almost twice the intended rolling limit.',
    memory: 'O(1)',
  },
  log: {
    name: 'Sliding log',
    short: 'Keep timestamps from the exact rolling interval.',
    strength: 'Accurate for every rolling window.',
    cost: 'Stores many timestamps and requires atomic pruning.',
    memory: 'O(limit)',
  },
  counter: {
    name: 'Sliding counter',
    short: 'Blend the previous and current fixed-window counts.',
    strength: 'Smooth approximation with constant-size state.',
    cost: 'Can be wrong when previous traffic was uneven.',
    memory: 'O(1)',
  },
}

function fixedWindowSteps(): SimulationStep[] {
  const times = [2, 4, 6, 8, 9, 10, 11, 12, 13, 14, 15]
  const counts = new Map<number, number>()
  return times.map((time, index) => {
    const windowStart = Math.floor(time / 10) * 10
    const count = counts.get(windowStart) ?? 0
    const accepted = count < 5
    if (accepted) counts.set(windowStart, count + 1)
    return {
      time,
      request: `R${index + 1}`,
      decision: accepted ? 'accepted' : 'rejected',
      headline: accepted ? 'Counter has room' : 'Window quota is full',
      state: `[${windowStart}, ${windowStart + 10}) · ${accepted ? count + 1 : count}/5 accepted`,
      formula: `count before request = ${count}`,
      note: accepted
        ? `This request belongs to the window beginning at ${windowStart}s.`
        : 'The counter already reached 5, so the request receives HTTP 429.',
    }
  })
}

function slidingLogSteps(): SimulationStep[] {
  const times = [2, 4, 6, 8, 9, 10, 11, 13, 15, 17]
  let acceptedLog: number[] = []
  return times.map((time, index) => {
    const expired = acceptedLog.filter((stamp) => stamp <= time - 10)
    acceptedLog = acceptedLog.filter((stamp) => stamp > time - 10)
    const accepted = acceptedLog.length < 5
    if (accepted) acceptedLog.push(time)
    return {
      time,
      request: `R${index + 1}`,
      decision: accepted ? 'accepted' : 'rejected',
      headline: accepted ? 'A slot exists in the rolling log' : 'Five accepted timestamps remain',
      state: `{ ${acceptedLog.join(', ')} }`,
      formula: `active interval = (${time - 10}, ${time}]`,
      note: `${expired.length ? `Expired ${expired.join(', ')}. ` : ''}${
        accepted ? 'Accepted requests are added to the log.' : 'Rejected attempts are not added to the usage log.'
      }`,
    }
  })
}

function tokenBucketSteps(): SimulationStep[] {
  const times = [0, 0, 0, 0, 0, 1, 1, 2, 4, 4, 4]
  let tokens = 5
  let lastTime = 0
  return times.map((time, index) => {
    const refill = time - lastTime
    tokens = Math.min(5, tokens + refill)
    lastTime = time
    const before = tokens
    const accepted = tokens >= 1
    if (accepted) tokens -= 1
    return {
      time,
      request: `R${index + 1}`,
      decision: accepted ? 'accepted' : 'rejected',
      headline: accepted ? 'Spend one token' : 'Bucket is empty',
      state: `${tokens} / 5 tokens remain`,
      formula: `min(5, previous + ${refill} refill) = ${before}`,
      note: accepted
        ? 'One available token is consumed.'
        : `No token is available. The next token arrives at ${time + 1}s.`,
    }
  })
}

function slidingCounterSteps(): SimulationStep[] {
  const times = [5, 5, 6, 7, 8, 9, 10, 10, 11, 12, 13, 14]
  let currentWindow = 5
  let previousCount = 4
  let currentCount = 0
  return times.map((time, index) => {
    const windowStart = Math.floor(time / 5) * 5
    if (windowStart !== currentWindow) {
      previousCount = currentCount
      currentCount = 0
      currentWindow = windowStart
    }
    const elapsed = time - currentWindow
    const weight = 1 - elapsed / 5
    const estimate = previousCount * weight + currentCount
    const accepted = estimate + 1 <= 5
    if (accepted) currentCount += 1
    return {
      time,
      request: `R${index + 1}`,
      decision: accepted ? 'accepted' : 'rejected',
      headline: accepted ? 'Weighted estimate stays within 5' : 'Prospective estimate exceeds 5',
      state: `previous ${previousCount} · current ${currentCount}`,
      formula: `${previousCount} × ${weight.toFixed(1)} + ${currentCount - (accepted ? 1 : 0)} + 1 = ${(
        estimate + 1
      ).toFixed(1)}`,
      note: `${Math.round(weight * 100)}% of the previous 5-second window still overlaps the rolling window.`,
    }
  })
}

function leakyBucketSteps(): SimulationStep[] {
  const arrivals: Record<number, string[]> = {
    0: ['R1', 'R2', 'R3'],
    1: ['R4', 'R5', 'R6'],
    2: ['R7', 'R8'],
    3: ['R9'],
    4: ['R10', 'R11', 'R12'],
    5: [],
    6: [],
  }
  const queue: string[] = []
  return Object.entries(arrivals).map(([timeValue, newRequests]) => {
    const time = Number(timeValue)
    const processed = time > 0 ? queue.shift() : undefined
    const rejected: string[] = []
    newRequests.forEach((request) => {
      if (queue.length < 4) queue.push(request)
      else rejected.push(request)
    })
    return {
      time,
      request: newRequests.length ? newRequests.join(', ') : 'No arrivals',
      decision: rejected.length ? 'rejected' : processed ? 'processed' : 'queued',
      headline: rejected.length
        ? `Queue full · ${rejected.join(', ')} rejected`
        : processed
          ? `${processed} leaked to the API`
          : 'Requests enter the queue',
      state: `queue → [${queue.join(', ')}]`,
      formula: `processed first: ${processed ?? 'none'} · arrivals: ${newRequests.join(', ') || 'none'}`,
      note: 'Capacity is 4. One queued request is processed before this second’s arrivals are added.',
    }
  })
}

function AlgorithmLab() {
  const [algorithm, setAlgorithm] = useState<AlgorithmId>('token')
  const [stepIndex, setStepIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const steps = useMemo(() => {
    if (algorithm === 'fixed') return fixedWindowSteps()
    if (algorithm === 'log') return slidingLogSteps()
    if (algorithm === 'counter') return slidingCounterSteps()
    if (algorithm === 'leaky') return leakyBucketSteps()
    return tokenBucketSteps()
  }, [algorithm])
  const step = steps[stepIndex]

  function selectAlgorithm(next: AlgorithmId) {
    setAlgorithm(next)
    setStepIndex(0)
    setPlaying(false)
  }

  function advance() {
    if (stepIndex >= steps.length - 1) {
      setStepIndex(0)
      return
    }
    setStepIndex((current) => current + 1)
  }

  return (
    <div className="algorithm-lab">
      <div className="algorithm-tabs" role="tablist">
        {(Object.keys(ALGORITHMS) as AlgorithmId[]).map((id) => (
          <button
            key={id}
            className={algorithm === id ? 'active' : ''}
            onClick={() => selectAlgorithm(id)}
            role="tab"
            aria-selected={algorithm === id}
          >
            {ALGORITHMS[id].name}
          </button>
        ))}
      </div>
      <div className="algorithm-summary">
        <div>
          <small>How it works</small>
          <h3>{ALGORITHMS[algorithm].name}</h3>
          <p>{ALGORITHMS[algorithm].short}</p>
        </div>
        <div className="algorithm-memory">
          <span>State</span>
          <strong>{ALGORITHMS[algorithm].memory}</strong>
        </div>
      </div>

      <div className="simulation-stage">
        <div className="simulation-visual">
          <div className="request-pulse" key={`${algorithm}-${stepIndex}`}>
            <span>{step.request}</span>
            <small>at {step.time}s</small>
          </div>
          <ArrowRight size={22} />
          <div className={`decision-machine decision-${step.decision}`}>
            {step.decision === 'accepted' || step.decision === 'processed' ? <Check /> : <X />}
            <strong>{step.headline}</strong>
            <span>{step.state}</span>
          </div>
        </div>
        <div className="simulation-explain">
          <small>Decision math</small>
          <code>{step.formula}</code>
          <p>{step.note}</p>
        </div>
      </div>

      <div className="timeline">
        {steps.map((item, index) => (
          <button
            key={`${item.time}-${index}`}
            className={`${index === stepIndex ? 'active' : ''} ${index < stepIndex ? 'past' : ''}`}
            onClick={() => {
              setStepIndex(index)
              setPlaying(false)
            }}
            aria-label={`Go to ${item.request} at ${item.time} seconds`}
          >
            <i />
            <span>{item.time}s</span>
          </button>
        ))}
      </div>

      <div className="simulation-controls">
        <button
          onClick={() => {
            setStepIndex(0)
            setPlaying(false)
          }}
        >
          <SkipBack size={15} /> Reset
        </button>
        <button
          className="play-control"
          onClick={() => {
            setPlaying((current) => !current)
            advance()
          }}
        >
          {playing ? <Pause size={15} /> : <Play size={15} />}
          {stepIndex === steps.length - 1 ? 'Replay' : 'Play one step'}
        </button>
        <button onClick={advance}>
          Next <StepForward size={15} />
        </button>
      </div>

      <div className="algorithm-tradeoffs">
        <div className="tradeoff-good">
          <Check size={17} />
          <span>
            <strong>Best part</strong>
            {ALGORITHMS[algorithm].strength}
          </span>
        </div>
        <div className="tradeoff-cost">
          <AlertTriangle size={17} />
          <span>
            <strong>Watch out</strong>
            {ALGORITHMS[algorithm].cost}
          </span>
        </div>
      </div>
    </div>
  )
}

function RaceLab() {
  const [atomic, setAtomic] = useState(false)
  const [failMode, setFailMode] = useState<'open' | 'closed'>('open')
  return (
    <div className="race-lab">
      <div className="race-heading">
        <div>
          <small>Concurrency experiment</small>
          <h3>Two requests arrive together</h3>
        </div>
        <button onClick={() => setAtomic((current) => !current)}>
          {atomic ? <LockKeyhole size={16} /> : <RefreshCw size={16} />}
          {atomic ? 'Atomic Lua script' : 'Naive read → write'}
        </button>
      </div>
      <div className="race-diagram">
        <div className="race-request">
          <span>Request A</span>
          <code>read 3</code>
          <ArrowRight />
        </div>
        <div className="race-request">
          <span>Request B</span>
          <code>{atomic ? 'wait' : 'read 3'}</code>
          <ArrowRight />
        </div>
        <div className="redis-box">
          <Database size={25} />
          <span>Redis counter</span>
          <strong>{atomic ? '5' : '4'}</strong>
        </div>
      </div>
      <ConceptNote title={atomic ? 'Correct: both increments are preserved' : 'Race: one increment disappears'} tone={atomic ? 'good' : 'warning'}>
        {atomic
          ? 'Prune/check/update/expiry run as one indivisible operation. Other requests cannot slip into the middle.'
          : 'Both clients read 3 and write 4. Redis INCR itself is atomic; this bug comes from a non-atomic client-side read-modify-write.'}
      </ConceptNote>
      <div className="failure-choice">
        <div>
          <small>If Redis cannot answer…</small>
          <strong>{failMode === 'open' ? 'Fail open' : 'Fail closed'}</strong>
          <p>
            {failMode === 'open'
              ? 'Allow traffic. Availability wins, but overload protection weakens.'
              : 'Reject traffic. Protection wins, but healthy users may be blocked.'}
          </p>
        </div>
        <div className="segmented-control">
          <button className={failMode === 'open' ? 'active' : ''} onClick={() => setFailMode('open')}>
            Open
          </button>
          <button className={failMode === 'closed' ? 'active' : ''} onClick={() => setFailMode('closed')}>
            Closed
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RateLimiterModule() {
  return (
    <ModuleShell
      code="02"
      title="Design a Rate Limiter"
      subtitle="Learn how an API says “not yet” without becoming slow, unfair, or fragile."
      color="#e86d5a"
      icon={<ShieldCheck size={29} />}
      sections={SECTIONS}
    >
      <section className="module-section" id="rate-why">
        <SectionIntro eyebrow="01 · Purpose & scope" title="Protect the door, not the visitor">
          A rate limiter controls how many requests one identity may make over time. It protects availability and cost,
          but should explain rejection clearly.
        </SectionIntro>
        <div className="metric-card-row">
          <article>
            <span className="metric-icon">
              <ShieldCheck />
            </span>
            <small>Prevent abuse</small>
            <strong>2 posts / second</strong>
            <p>Limit by user, API key, tenant, IP, device, route—or a combination.</p>
          </article>
          <article>
            <span className="metric-icon">
              <Gauge />
            </span>
            <small>Control cost</small>
            <strong>10 accounts / day</strong>
            <p>Stop expensive APIs or automated signups from consuming unlimited resources.</p>
          </article>
          <article>
            <span className="metric-icon">
              <Server />
            </span>
            <small>Protect capacity</small>
            <strong>5 rewards / week</strong>
            <p>Keep downstream servers responsive when demand suddenly spikes.</p>
          </article>
        </div>
        <div className="placement-visual">
          <div className="placement-client">Client</div>
          <ArrowRight />
          <div className="placement-limiter">
            <ShieldCheck size={19} /> Limiter middleware
          </div>
          <ArrowRight />
          <div className="placement-servers">
            <span>API</span>
            <span>API</span>
            <span>API</span>
          </div>
        </div>
        <div className="requirements-grid">
          {[
            ['Accurate', 'Enforce the configured rule with a defined boundary policy.'],
            ['Fast', 'Add very little latency to every request.'],
            ['Distributed', 'Share quota state across many API servers.'],
            ['Explainable', 'Return HTTP 429 and useful retry information.'],
            ['Fault-tolerant', 'Choose deliberate behavior when state is unavailable.'],
            ['Memory-aware', 'Expire idle identities and avoid unbounded logs.'],
          ].map(([title, copy]) => (
            <div key={title}>
              <Check size={15} />
              <span>
                <strong>{title}</strong>
                {copy}
              </span>
            </div>
          ))}
        </div>
        <TheoryNotebook
          title="Rate limiting foundations"
          intro="Before comparing algorithms, build a clear picture of what is being counted, whose usage is counted, and what happens when the rule is reached."
          topics={[
            {
              title: 'Rate, quota, and burst are different',
              plain:
                'A rate describes speed, such as 10 requests each second. A quota describes a total allowance, such as 1,000 requests each day. A burst is a short cluster of requests that arrives faster than the long-term rate.',
              analogy:
                'A road may allow 600 cars per hour but still accept 20 cars arriving together at a green light. The hourly flow and the momentary burst describe different things.',
              technical:
                'Token buckets represent this distinction directly: refill rate controls long-term throughput, while bucket capacity controls the largest immediately acceptable burst.',
              remember: 'Always ask two questions: “How fast over time?” and “How many may arrive together?”',
            },
            {
              title: 'The limit belongs to an identity and a scope',
              plain:
                'A number like “5 per minute” is incomplete. You must say five for whom and for which action: per user, tenant, API key, IP address, device, route, or a combination.',
              analogy:
                'A library can limit five books per person, not five books for the entire building. It may apply a different rule to rare-reference books.',
              technical:
                'A state key often combines dimensions such as tenant:user:route. More dimensions improve control but create more counters and higher-cardinality storage.',
              remember: 'A good rule is shaped like: identity + operation + amount + period.',
            },
            {
              title: 'Admission control versus traffic shaping',
              plain:
                'An admission limiter makes an immediate yes/no decision. A traffic shaper may place work in a queue and release it at a controlled speed.',
              analogy:
                'A nightclub bouncer rejects people when full; an airport security line keeps accepted people waiting and processes them steadily.',
              technical:
                'Queueing changes latency and API semantics. It is safe mainly for asynchronous, idempotent, deadline-aware work—not every synchronous HTTP request.',
              remember: 'Rejecting protects latency; queueing smooths work but makes callers wait.',
            },
            {
              title: 'Every algorithm stores a compressed history',
              plain:
                'The limiter needs enough memory of the past to decide whether the next request is allowed. Different algorithms remember different amounts.',
              analogy:
                'A fixed counter remembers only a total, while a sliding log keeps every receipt. More detailed receipts answer more precise questions but occupy more space.',
              technical:
                'Fixed and sliding counters use constant-size state. Exact logs use state proportional to accepted traffic. Token buckets summarize history as a token balance.',
              remember: 'Accuracy, memory, and computation form a trade-off—you rarely maximize all three.',
            },
            {
              title: 'Time and boundaries are part of correctness',
              plain:
                'The system must define which window owns a boundary timestamp and whether a request exactly one period old still counts.',
              analogy:
                'A train ticket valid “until 10:00” is ambiguous unless the railway says whether 10:00:00 is inside or outside the valid period.',
              technical:
                'Use trusted server time, define intervals such as (now − W, now], and make expiration, counting, and insertion atomic to avoid off-by-one behavior.',
              remember: 'Write the interval with brackets before simulating a timeline.',
            },
            {
              title: 'Placement changes trust and latency',
              plain:
                'Client-side limits are easy to bypass. Server middleware gives control, while an API gateway can reject traffic before it reaches application servers.',
              analogy:
                'A sign asking visitors to count themselves is weaker than a receptionist; a gate at the property entrance protects more of the building.',
              technical:
                'Gateways may combine TLS termination, authentication, routing, allowlists, and limits. Application-level limits still cannot stop upstream bandwidth exhaustion.',
              remember: 'Enforce important limits in infrastructure you control, as early as practical.',
            },
            {
              title: 'Distributed limits trade strictness for availability',
              plain:
                'If several regions count independently, they can temporarily allow more than the global quota. If every request coordinates globally, the answer becomes slower and may fail during a network partition.',
              analogy:
                'Two shop branches sharing one gift-card balance can call headquarters for every purchase or work from delayed copies. One is slower; the other can briefly overspend.',
              technical:
                'Shared Redis, consistent ownership, leased regional token allocations, and hierarchical quotas make different latency, consistency, and failure trade-offs.',
              remember: 'There is no free global counter: strictness requires coordination.',
            },
            {
              title: 'Fairness and recovery matter to real users',
              plain:
                'A technically correct counter can still be unfair. Many people may share one IP, retries may synchronize, and one expensive request may cost far more than another.',
              analogy:
                'Charging every table in a restaurant by number of orders is unfair if one order is a coffee and another is a banquet.',
              technical:
                'Consider weighted request costs, tenant isolation, Retry-After, exponential backoff with jitter, idempotency, and separate abuse controls.',
              remember: 'A useful limiter protects the system without surprising well-behaved clients.',
            },
          ]}
        />
      </section>

      <section className="module-section module-tint" id="rate-algorithms">
        <SectionIntro eyebrow="02 · Algorithm lab" title="Same traffic. Five different answers.">
          Step through the supplied request timelines. Watch both the decision and the hidden state that produced it.
        </SectionIntro>
        <AlgorithmLab />
        <ConceptNote title="Boundary rule matters" tone="warning">
          A timestamp exactly one window old must be either included or excluded consistently. This lab uses the
          rolling interval <code>(now − window, now]</code> and stores accepted requests only.
        </ConceptNote>
      </section>

      <section className="module-section" id="rate-architecture">
        <SectionIntro eyebrow="03 · High-level design" title="One decision in the path of every request">
          The middleware identifies the caller, finds a cached rule, atomically updates shared state, then forwards or
          rejects.
        </SectionIntro>
        <div className="architecture-canvas">
          <div className="arch-node">
            <Network />
            <span>Client</span>
          </div>
          <ArrowRight />
          <div className="arch-node arch-primary">
            <ShieldCheck />
            <span>Limiter</span>
            <small>match rule · check state</small>
          </div>
          <div className="arch-branches">
            <div>
              <ArrowRight />
              <div className="arch-node">
                <Server />
                <span>API servers</span>
                <small>accepted</small>
              </div>
            </div>
            <div>
              <ArrowRight />
              <div className="arch-node">
                <Database />
                <span>Redis</span>
                <small>counter + TTL</small>
              </div>
            </div>
            <div>
              <ArrowRight />
              <div className="arch-node arch-reject">
                <AlertTriangle />
                <span>HTTP 429</span>
                <small>drop or safely queue</small>
              </div>
            </div>
          </div>
        </div>
        <div className="response-card">
          <div className="response-code">429</div>
          <div>
            <small>Too Many Requests</small>
            <code>RateLimit-Limit: 5</code>
            <code>RateLimit-Remaining: 0</code>
            <code>Retry-After: 42</code>
          </div>
          <p>
            <strong>Client behavior:</strong> catch 429, wait, then retry with exponential backoff and jitter. Immediate
            synchronized retries create another burst.
          </p>
        </div>
      </section>

      <section className="module-section dark-module-section" id="rate-distributed">
        <SectionIntro eyebrow="04 · Design deep dive" title="A correct local counter can still fail globally">
          Multiple limiter instances introduce races, stale state, regions, and failure-policy decisions.
        </SectionIntro>
        <RaceLab />
        <div className="distributed-cards">
          <article>
            <Cloud />
            <h3>Multi-region</h3>
            <p>
              Route users nearby for low latency. A strict global quota requires coordination; eventual consistency
              can temporarily over-admit.
            </p>
          </article>
          <article>
            <Activity />
            <h3>Monitor outcomes</h3>
            <p>Track allowed, rejected, Redis latency, hot identities, false rejections, and queue delay.</p>
          </article>
          <article>
            <Zap />
            <h3>Layer defenses</h3>
            <p>An application limiter cannot stop bandwidth exhaustion before traffic reaches it. Add edge controls.</p>
          </article>
        </div>
      </section>

      <section className="module-section" id="rate-recap">
        <SectionIntro eyebrow="05 · Decision guide" title="Choose the shape of traffic you want">
          There is no universally best limiter. Start from burst tolerance, accuracy, memory, and queueing semantics.
        </SectionIntro>
        <div className="decision-table">
          <div className="decision-row decision-header">
            <span>Need</span>
            <span>Good starting point</span>
            <span>Why</span>
          </div>
          {[
            ['Allow useful bursts', 'Token bucket', 'Capacity explicitly defines burst size.'],
            ['Smooth downstream work', 'Leaky bucket', 'A FIFO queue drains at a fixed rate.'],
            ['Cheapest simple quota', 'Fixed window', 'One counter and one expiry per identity.'],
            ['Exact rolling limit', 'Sliding log', 'Every accepted timestamp is represented.'],
            ['Smooth + low memory', 'Sliding counter', 'Two counters approximate rolling usage.'],
          ].map((row) => (
            <div className="decision-row" key={row[0]}>
              <strong>{row[0]}</strong>
              <span>{row[1]}</span>
              <p>{row[2]}</p>
            </div>
          ))}
        </div>
        <ConceptNote title="Soft and hard are policy choices">
          A token bucket may allow bursts and still be a strictly enforced hard limit. “Burst allowed” and “sometimes
          exceed the rule” are different ideas.
        </ConceptNote>
      </section>
    </ModuleShell>
  )
}
