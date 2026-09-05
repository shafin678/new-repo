import {
  ArrowRight,
  BookOpenCheck,
  Calculator,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Gauge,
  Lightbulb,
  ListOrdered,
  RotateCcw,
  Sigma,
  StepForward,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { ConceptNote, ModuleSection, ModuleShell, SectionIntro, TheoryNotebook } from './ModuleScaffold'

type PracticeRow = {
  time: string
  request: string
  state: string
  decision: 'Accepted' | 'Rejected' | 'Queued' | 'Processed'
  why: string
}

type Exercise = {
  id: number
  title: string
  subtitle: string
  rule: string
  columns: [string, string, string, string]
  rows: PracticeRow[]
  correction?: string
}

const SECTIONS: ModuleSection[] = [
  { id: 'math-workbench', label: 'Rate-limit exercises' },
  { id: 'math-latency', label: 'Weighted latency' },
  { id: 'math-patterns', label: 'Problem-solving pattern' },
]

const EXERCISES: Exercise[] = [
  {
    id: 1,
    title: 'Fixed window counter',
    subtitle: 'Where does a timestamp belong?',
    rule: 'Limit 5 requests per 10-second window: [0,10), [10,20)…',
    columns: ['Time', 'Request', 'Window + count', 'Decision'],
    rows: [2, 4, 6, 8, 9, 10, 11, 12, 13, 14, 15].map((time, index) => {
      const secondWindow = time >= 10
      const count = secondWindow ? index - 5 : index
      const accepted = count < 5
      return {
        time: `${time}s`,
        request: `R${index + 1}`,
        state: `${secondWindow ? '[10,20)' : '[0,10)'} · before=${Math.min(count, 5)}`,
        decision: accepted ? 'Accepted' : 'Rejected',
        why: accepted ? 'The counter before this request is below 5.' : 'The current window already accepted 5.',
      }
    }),
  },
  {
    id: 2,
    title: 'Sliding window log',
    subtitle: 'Keep only timestamps inside the rolling interval',
    rule: 'Limit 5 accepted requests in (now − 10s, now].',
    columns: ['Time', 'Request', 'Accepted log', 'Decision'],
    rows: [
      ['2', 'R1', '{2}', 'Accepted'],
      ['4', 'R2', '{2, 4}', 'Accepted'],
      ['6', 'R3', '{2, 4, 6}', 'Accepted'],
      ['8', 'R4', '{2, 4, 6, 8}', 'Accepted'],
      ['9', 'R5', '{2, 4, 6, 8, 9}', 'Accepted'],
      ['10', 'R6', '{2, 4, 6, 8, 9}', 'Rejected'],
      ['11', 'R7', '{2, 4, 6, 8, 9}', 'Rejected'],
      ['13', 'R8', '{4, 6, 8, 9, 13}', 'Accepted'],
      ['15', 'R9', '{6, 8, 9, 13, 15}', 'Accepted'],
      ['17', 'R10', '{8, 9, 13, 15, 17}', 'Accepted'],
    ].map(([time, request, state, decision]) => ({
      time: `${time}s`,
      request,
      state,
      decision: decision as PracticeRow['decision'],
      why:
        decision === 'Accepted'
          ? 'Expired timestamps are removed, leaving room for this request.'
          : 'Five accepted timestamps still fall inside the rolling interval.',
    })),
  },
  {
    id: 3,
    title: 'Sliding window counter',
    subtitle: 'Weight the previous bucket',
    rule: 'Limit 5 per 5 seconds. Previous [0,5) count = 4. Accept when estimate + 1 ≤ 5.',
    columns: ['Time', 'Request', 'Prospective estimate', 'Decision'],
    rows: [
      ['5', 'R1', '4×1.0 + 0 + 1 = 5.0', 'Accepted'],
      ['5', 'R2', '4×1.0 + 1 + 1 = 6.0', 'Rejected'],
      ['6', 'R3', '4×0.8 + 1 + 1 = 5.2', 'Rejected'],
      ['7', 'R4', '4×0.6 + 1 + 1 = 4.4', 'Accepted'],
      ['8', 'R5', '4×0.4 + 2 + 1 = 4.6', 'Accepted'],
      ['9', 'R6', '4×0.2 + 3 + 1 = 4.8', 'Accepted'],
      ['10', 'R7', '4×1.0 + 0 + 1 = 5.0', 'Accepted'],
      ['10', 'R8', '4×1.0 + 1 + 1 = 6.0', 'Rejected'],
      ['11', 'R9', '4×0.8 + 1 + 1 = 5.2', 'Rejected'],
      ['12', 'R10', '4×0.6 + 1 + 1 = 4.4', 'Accepted'],
      ['13', 'R11', '4×0.4 + 2 + 1 = 4.6', 'Accepted'],
      ['14', 'R12', '4×0.2 + 3 + 1 = 4.8', 'Accepted'],
    ].map(([time, request, state, decision]) => ({
      time: `${time}s`,
      request,
      state,
      decision: decision as PracticeRow['decision'],
      why:
        decision === 'Accepted'
          ? 'Including the candidate request keeps the weighted estimate at or below 5.'
          : 'The candidate would push the weighted estimate above 5.',
    })),
  },
  {
    id: 4,
    title: 'Token bucket',
    subtitle: 'Refill before spending',
    rule: 'Capacity 5, initially 5, refill 1 token/second, request cost 1.',
    columns: ['Time', 'Request', 'Tokens before → after', 'Decision'],
    rows: [
      ['0', 'R1', '5 → 4', 'Accepted'],
      ['0', 'R2', '4 → 3', 'Accepted'],
      ['0', 'R3', '3 → 2', 'Accepted'],
      ['0', 'R4', '2 → 1', 'Accepted'],
      ['0', 'R5', '1 → 0', 'Accepted'],
      ['1', 'R6', '1 → 0', 'Accepted'],
      ['1', 'R7', '0 → 0', 'Rejected'],
      ['2', 'R8', '1 → 0', 'Accepted'],
      ['4', 'R9', '2 → 1', 'Accepted'],
      ['4', 'R10', '1 → 0', 'Accepted'],
      ['4', 'R11', '0 → 0', 'Rejected'],
    ].map(([time, request, state, decision]) => ({
      time: `${time}s`,
      request,
      state,
      decision: decision as PracticeRow['decision'],
      why: decision === 'Accepted' ? 'At least one token is available and consumed.' : 'No token is available.',
    })),
    correction: 'The supplied solution stops at R9. R10 is accepted and R11 is rejected.',
  },
  {
    id: 5,
    title: 'Leaky bucket',
    subtitle: 'Process first, then add arrivals',
    rule: 'Queue capacity 4; process one queued request each second before arrivals.',
    columns: ['Time', 'Processed / arrivals', 'Queue after arrivals', 'Decision'],
    rows: [
      ['0', '— / R1,R2,R3', '[R1,R2,R3]', 'Queued', 'Three requests enter the empty queue.'],
      ['1', 'R1 / R4,R5,R6', '[R2,R3,R4,R5]', 'Rejected', 'R6 finds the four-slot queue full.'],
      ['2', 'R2 / R7,R8', '[R3,R4,R5,R7]', 'Rejected', 'R8 finds the queue full.'],
      ['3', 'R3 / R9', '[R4,R5,R7,R9]', 'Queued', 'One slot opens, so R9 enters.'],
      ['4', 'R4 / R10,R11,R12', '[R5,R7,R9,R10]', 'Rejected', 'R11 and R12 overflow the queue.'],
      ['5', 'R5 / —', '[R7,R9,R10]', 'Processed', 'No arrivals; the queue drains.'],
      ['6', 'R7 / —', '[R9,R10]', 'Processed', 'R9 and R10 would drain at 7s and 8s.'],
    ].map(([time, request, state, decision, why]) => ({
      time: `${time}s`,
      request,
      state,
      decision: decision as PracticeRow['decision'],
      why,
    })),
  },
]

function ExerciseWorkbench() {
  const [exerciseIndex, setExerciseIndex] = useState(0)
  const [revealed, setRevealed] = useState(1)
  const exercise = EXERCISES[exerciseIndex]
  const current = exercise.rows[Math.max(0, revealed - 1)]

  function selectExercise(index: number) {
    setExerciseIndex(index)
    setRevealed(1)
  }

  return (
    <div className="practice-workbench">
      <div className="exercise-tabs">
        {EXERCISES.map((item, index) => (
          <button className={index === exerciseIndex ? 'active' : ''} onClick={() => selectExercise(index)} key={item.id}>
            <span>Q{item.id}</span>
            {item.title}
          </button>
        ))}
      </div>
      <div className="exercise-heading">
        <div>
          <small>Question {exercise.id} · {exercise.subtitle}</small>
          <h3>{exercise.title}</h3>
          <p>{exercise.rule}</p>
        </div>
        <div className="exercise-progress">
          <strong>{revealed}</strong>
          <span>/ {exercise.rows.length} steps</span>
        </div>
      </div>
      <div className="current-decision">
        <div className="decision-request">
          <Clock3 />
          <span>{current.time}</span>
          <strong>{current.request}</strong>
        </div>
        <ArrowRight />
        <code>{current.state}</code>
        <ArrowRight />
        <div className={`practice-decision ${current.decision.toLowerCase()}`}>
          {current.decision === 'Accepted' || current.decision === 'Processed' || current.decision === 'Queued' ? (
            <Check size={17} />
          ) : (
            <X size={17} />
          )}
          {current.decision}
        </div>
      </div>
      <div className="decision-reason">
        <Lightbulb size={18} />
        <p>{current.why}</p>
      </div>
      <div className="solution-table">
        <div className="solution-row solution-header">
          {exercise.columns.map((column) => (
            <span key={column}>{column}</span>
          ))}
        </div>
        {exercise.rows.slice(0, revealed).map((row) => (
          <div className="solution-row" key={`${row.time}-${row.request}`}>
            <span>{row.time}</span>
            <strong>{row.request}</strong>
            <code>{row.state}</code>
            <span className={`table-decision ${row.decision.toLowerCase()}`}>{row.decision}</span>
          </div>
        ))}
      </div>
      <div className="practice-controls">
        <button
          onClick={() => setRevealed((currentValue) => Math.max(1, currentValue - 1))}
          disabled={revealed === 1}
        >
          <ChevronLeft size={16} /> Previous
        </button>
        <button
          onClick={() => setRevealed(1)}
          disabled={revealed === 1}
        >
          <RotateCcw size={15} /> Reset
        </button>
        <button
          className="practice-next"
          onClick={() =>
            setRevealed((currentValue) => (currentValue === exercise.rows.length ? 1 : currentValue + 1))
          }
        >
          {revealed === exercise.rows.length ? 'Replay' : 'Reveal next'} <StepForward size={16} />
        </button>
      </div>
      {exercise.correction && (
        <ConceptNote title="Correction preserved in this canvas" tone="warning">
          {exercise.correction}
        </ConceptNote>
      )}
    </div>
  )
}

function WeightedLatencyLab() {
  const [hitRate, setHitRate] = useState(80)
  const [compression, setCompression] = useState(50)
  const commonNs = 7 + 100 + 10_240_000 + 500_000
  const networkNs = 10_000_000 * (1 - compression / 100)
  const memoryNs = commonNs + 250_000 + networkNs
  const diskNs = commonNs + 10_000_000 + 30_000_000 + networkNs
  const expectedNs = (hitRate / 100) * memoryNs + (1 - hitRate / 100) * diskNs

  return (
    <div className="weighted-lab">
      <div className="weighted-controls">
        <label>
          <span>
            Memory hit rate <strong>{hitRate}%</strong>
          </span>
          <input
            type="range"
            min="0"
            max="100"
            value={hitRate}
            onChange={(event) => setHitRate(Number(event.target.value))}
          />
        </label>
        <label>
          <span>
            Compression reduction <strong>{compression}%</strong>
          </span>
          <input
            type="range"
            min="0"
            max="90"
            step="10"
            value={compression}
            onChange={(event) => setCompression(Number(event.target.value))}
          />
        </label>
      </div>
      <div className="branch-equations">
        <article>
          <div>
            <span>Fast branch</span>
            <strong>{hitRate}% memory hit</strong>
          </div>
          <code>L2 + mutex + memory read + compress + RTT + transfer</code>
          <b>{(memoryNs / 1_000_000).toFixed(6)} ms</b>
        </article>
        <article>
          <div>
            <span>Slow branch</span>
            <strong>{100 - hitRate}% disk miss</strong>
          </div>
          <code>L2 + mutex + seek + disk read + compress + RTT + transfer</code>
          <b>{(diskNs / 1_000_000).toFixed(6)} ms</b>
        </article>
      </div>
      <div className="expected-equation">
        <Sigma size={30} />
        <div>
          <small>Expected latency</small>
          <code>
            {hitRate / 100} × {(memoryNs / 1_000_000).toFixed(3)} + {(100 - hitRate) / 100} ×{' '}
            {(diskNs / 1_000_000).toFixed(3)}
          </code>
        </div>
        <strong>{(expectedNs / 1_000_000).toFixed(6)} ms</strong>
      </div>
      <ConceptNote title="Source default answer: 23.940107 ms" tone="good">
        The supplied notes correctly use one combined 100 ns mutex operation and omit the memory read on a disk miss.
        They calculate both branches but omit this final weighted-average step.
      </ConceptNote>
    </div>
  )
}

export default function MathPracticeModule() {
  return (
    <ModuleShell
      code="05"
      title="Math Practice"
      subtitle="Work request by request. Reveal one row at a time, inspect the hidden state, and learn where off-by-one errors happen."
      color="#3478d4"
      icon={<BookOpenCheck size={29} />}
      sections={SECTIONS}
    >
      <section className="module-section" id="math-workbench">
        <SectionIntro eyebrow="01 · Exercises 1–5" title="Rate limiting is state plus an ordering rule">
          The same timestamp can produce different behavior depending on window boundaries, accepted-log policy,
          refill order, and whether a queue drains before arrivals.
        </SectionIntro>
        <TheoryNotebook
          title="How to reason about request timelines"
          intro="The calculations become much easier when every request follows one written sequence. These concepts explain why the order matters."
          topics={[
            {
              title: 'State before and state after are not interchangeable',
              plain:
                'The decision is usually made from the state before the candidate request. If accepted, the request then changes the state.',
              analogy:
                'A five-seat room with four people has one free seat before a visitor enters and zero afterward. Both numbers are correct but answer different questions.',
              technical:
                'Tables should label counters as pre-request or post-request. A prospective formula explicitly adds the candidate once, such as estimated usage + 1 ≤ limit.',
              remember: 'Read state, test the candidate, then mutate state.',
            },
            {
              title: 'Simultaneous events still need an order',
              plain:
                'Requests with the same timestamp cannot all see the same unchanged state. The system processes them in some order, even if that order is extremely fast.',
              analogy:
                'Five people reach one checkout together, but the cashier still scans one basket before the next.',
              technical:
                'Production concurrency requires atomic operations. A written exercise normally uses left-to-right request order unless it says otherwise.',
              remember: 'Write down the tie-breaking order for equal timestamps.',
            },
            {
              title: 'Window brackets define edge behavior',
              plain:
                'A square bracket includes its endpoint; a round bracket excludes it. Therefore time 10 belongs to [10,20), not [0,10).',
              analogy:
                'Hotel checkout at 10 ends yesterday’s booking and begins the room’s next schedule.',
              technical:
                'For a rolling window, (now − 10, now] removes a request exactly ten seconds old and includes the new timestamp.',
              remember: 'At a boundary, decide the interval before counting.',
            },
            {
              title: 'Rejected requests normally do not consume quota',
              plain:
                'A rejected request did not use the protected service, so an exact usage log usually keeps accepted timestamps only.',
              analogy:
                'Being turned away from a full event should not count as attending the event.',
              technical:
                'Logging every rejected attempt can extend lockout forever under persistent retries. Separate abuse-attempt metrics may still count rejected traffic.',
              remember: 'Usage state and abuse-observation state can be different.',
            },
            {
              title: 'Advance time before processing arrivals',
              plain:
                'Elapsed time may refill tokens, expire log entries, rotate counters, or process one queued item before the next request is tested.',
              analogy:
                'A parking meter gains no time while you stare at it, but a water tank refills during every second that passes—even between visitors.',
              technical:
                'Token balance becomes min(capacity, previous + elapsed × refill rate). Leaky-bucket exercises must specify whether draining occurs before or after arrivals.',
              remember: 'First move the clock; then apply events at the new time.',
            },
            {
              title: 'Weighted averages describe alternative paths',
              plain:
                'If 80% of requests take a fast path and 20% take a slow path, multiply each path time by its probability and add the contributions.',
              analogy:
                'If four of five trips take 10 minutes and one takes 50, the long-run average is 18 minutes—not 60.',
              technical:
                'Expected latency E[L] = Σ pᵢLᵢ and probabilities must total 1. This does not describe p95 or worst-case latency.',
              remember: 'Calculate each complete branch first, then weight the branches.',
            },
          ]}
        />
        <ExerciseWorkbench />
      </section>

      <section className="module-section module-tint" id="math-latency">
        <SectionIntro eyebrow="02 · Exercise 6" title="Build both latency branches, then weight them">
          A cache hit and a disk miss take different paths. Expected latency is each path’s cost multiplied by its
          probability.
        </SectionIntro>
        <WeightedLatencyLab />
      </section>

      <section className="module-section dark-module-section" id="math-patterns">
        <SectionIntro eyebrow="03 · Reusable method" title="How to solve any timeline problem">
          Most mistakes disappear when you use the same sequence for every request and clearly label pre-state versus
          post-state.
        </SectionIntro>
        <div className="math-method">
          {[
            ['1', 'Advance time', 'Expire old timestamps, refill tokens, rotate windows, or drain the queue.'],
            ['2', 'Read state before', 'Write the counter, token balance, log, or queue before the candidate.'],
            ['3', 'Test the candidate', 'Include the incoming request exactly once when applying the limit.'],
            ['4', 'Commit or reject', 'Mutate accepted usage only; record both before and after values.'],
            ['5', 'Explain the boundary', 'State interval inclusivity and ordering for simultaneous events.'],
          ].map(([number, title, copy], index) => (
            <article key={number}>
              <i>{number}</i>
              <div>
                <small>Step {number}</small>
                <strong>{title}</strong>
                <p>{copy}</p>
              </div>
              {index < 4 && <ChevronRight />}
            </article>
          ))}
        </div>
        <div className="math-checklist">
          <Gauge />
          <div>
            <strong>Before accepting an answer</strong>
            <p>Check units, boundaries, event order, prospective count, and whether rejected attempts change state.</p>
          </div>
          <Calculator />
        </div>
      </section>
    </ModuleShell>
  )
}
