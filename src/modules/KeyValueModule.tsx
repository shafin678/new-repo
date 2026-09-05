import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Binary,
  Check,
  CircleDot,
  Cloud,
  Database,
  GitBranch,
  HardDrive,
  HeartPulse,
  Layers3,
  MemoryStick,
  Network,
  RefreshCcw,
  Server,
  ShieldCheck,
  Split,
  Workflow,
  X,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { ConceptNote, ModuleSection, ModuleShell, SectionIntro } from './ModuleScaffold'

const SECTIONS: ModuleSection[] = [
  { id: 'kv-contract', label: 'The contract' },
  { id: 'kv-cap', label: 'CAP under failure' },
  { id: 'kv-quorum', label: 'Partition & replicate' },
  { id: 'kv-conflict', label: 'Version conflicts' },
  { id: 'kv-failures', label: 'Handle failures' },
  { id: 'kv-storage', label: 'Read & write paths' },
]

function CapLab() {
  const [partitioned, setPartitioned] = useState(false)
  const [choice, setChoice] = useState<'cp' | 'ap'>('cp')
  return (
    <div className="cap-lab">
      <div className="cap-controls">
        <button className={partitioned ? 'danger-active' : ''} onClick={() => setPartitioned((current) => !current)}>
          <Split size={16} /> {partitioned ? 'Heal network' : 'Break n3 connection'}
        </button>
        {partitioned && (
          <div className="segmented-control">
            <button className={choice === 'cp' ? 'active' : ''} onClick={() => setChoice('cp')}>
              Choose C
            </button>
            <button className={choice === 'ap' ? 'active' : ''} onClick={() => setChoice('ap')}>
              Choose A
            </button>
          </div>
        )}
      </div>
      <div className={`cap-network ${partitioned ? 'is-partitioned' : ''}`}>
        <div className="cap-node cap-n1">
          <Database size={23} />
          <strong>n1</strong>
          <span>balance: $100</span>
        </div>
        <div className="cap-node cap-n2">
          <Database size={23} />
          <strong>n2</strong>
          <span>balance: $100</span>
        </div>
        <div className={`cap-node cap-n3 ${partitioned ? 'isolated' : ''}`}>
          <Database size={23} />
          <strong>n3</strong>
          <span>{partitioned && choice === 'ap' ? 'balance: $80' : 'balance: $100'}</span>
        </div>
        <svg viewBox="0 0 600 280" aria-hidden="true">
          <line x1="300" y1="55" x2="135" y2="220" />
          <line x1="300" y1="55" x2="465" y2="220" className={partitioned ? 'broken' : ''} />
          <line x1="135" y1="220" x2="465" y2="220" className={partitioned ? 'broken' : ''} />
        </svg>
      </div>
      <div className="cap-result">
        {!partitioned ? (
          <>
            <Check size={19} />
            <div>
              <strong>Normal operation: consistency and availability can coexist</strong>
              <p>Writes replicate to all three nodes and clients receive current data.</p>
            </div>
          </>
        ) : choice === 'cp' ? (
          <>
            <ShieldCheck size={19} />
            <div>
              <strong>CP choice: reject operations that cannot remain consistent</strong>
              <p>Some clients receive an error, but nobody receives a knowingly divergent balance.</p>
            </div>
          </>
        ) : (
          <>
            <Zap size={19} />
            <div>
              <strong>AP choice: keep serving and reconcile later</strong>
              <p>Both sides respond, but concurrent values may conflict after the network heals.</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function QuorumLab() {
  const [n, setN] = useState(3)
  const [w, setW] = useState(2)
  const [r, setR] = useState(2)
  const overlap = w + r > n

  function updateN(value: number) {
    setN(value)
    setW((current) => Math.min(current, value))
    setR((current) => Math.min(current, value))
  }

  return (
    <div className="quorum-lab">
      <div className="quorum-controls">
        {[
          ['N', n, updateN, 'replicas'],
          ['W', w, setW, 'write ACKs'],
          ['R', r, setR, 'read replies'],
        ].map(([name, value, setter, label]) => (
          <label key={name as string}>
            <span>
              <strong>{name as string}</strong>
              <small>{label as string}</small>
            </span>
            <input
              type="range"
              min="1"
              max={name === 'N' ? 5 : n}
              value={value as number}
              onChange={(event) => (setter as (next: number) => void)(Number(event.target.value))}
            />
            <b>{value as number}</b>
          </label>
        ))}
      </div>
      <div className="quorum-stage">
        <div className="coordinator">
          <Workflow size={22} />
          <strong>Coordinator</strong>
        </div>
        <div className="replica-fan">
          {Array.from({ length: n }, (_, index) => (
            <div
              className={`replica ${index < Math.max(w, r) ? 'responding' : ''}`}
              key={index}
              style={{ '--delay': `${index * 80}ms` } as React.CSSProperties}
            >
              <Database size={18} />
              S{index}
              <small>{index < w ? 'write ACK' : index < r ? 'read reply' : 'replica'}</small>
            </div>
          ))}
        </div>
      </div>
      <div className={`quorum-result ${overlap ? 'overlap' : 'no-overlap'}`}>
        <div>
          <small>Quorum overlap check</small>
          <strong>
            W + R = {w + r} {overlap ? '>' : '≤'} N = {n}
          </strong>
        </div>
        <span>{overlap ? <Check size={18} /> : <X size={18} />}</span>
        <p>
          {overlap
            ? 'A read quorum and write quorum must share at least one replica.'
            : 'The read may contact replicas that missed the latest acknowledged write.'}
        </p>
      </div>
      <ConceptNote title="Overlap is necessary—not magic" tone="warning">
        <code>W + R &gt; N</code> supports strong reads only with correct version ordering, durable acknowledgements,
        the intended replica set, and proper concurrent-write handling. Sloppy quorums can weaken this overlap.
      </ConceptNote>
    </div>
  )
}

const VERSION_STEPS = [
  {
    name: 'D1',
    value: 'John',
    clocks: ['Sx:1'],
    copy: 'The first write is handled by Sx. Its component begins at 1.',
    branches: false,
  },
  {
    name: 'D2',
    value: 'John',
    clocks: ['Sx:2'],
    copy: 'A later write from D1 increments Sx. D2 clearly descends from D1.',
    branches: false,
  },
  {
    name: 'D3 + D4',
    value: 'JohnSF  /  JohnNY',
    clocks: ['Sx:2 · Sy:1', 'Sx:2 · Sz:1'],
    copy: 'Two clients update D2 independently. Neither vector dominates the other, so they are concurrent siblings.',
    branches: true,
  },
  {
    name: 'D5',
    value: 'John · merged',
    clocks: ['Sx:3 · Sy:1 · Sz:1'],
    copy: 'The client resolves the business value. The merged clock takes maxima, then Sx increments.',
    branches: false,
  },
]

function VersionLab() {
  const [step, setStep] = useState(0)
  const current = VERSION_STEPS[step]
  return (
    <div className="version-lab">
      <div className="version-flow">
        {VERSION_STEPS.map((item, index) => (
          <button className={index === step ? 'active' : ''} onClick={() => setStep(index)} key={item.name}>
            <i>{index + 1}</i>
            <span>{item.name}</span>
          </button>
        ))}
      </div>
      <div className={`version-stage ${current.branches ? 'has-conflict' : ''}`}>
        <div className="version-object">
          <small>{current.name}</small>
          <strong>{current.value}</strong>
          <div>
            {current.clocks.map((clock) => (
              <code key={clock}>{clock}</code>
            ))}
          </div>
        </div>
        <div className="version-copy">
          <span>{current.branches ? <AlertTriangle /> : <GitBranch />}</span>
          <div>
            <strong>{current.branches ? 'Conflict detected' : step === 3 ? 'Conflict reconciled' : 'Causal history'}</strong>
            <p>{current.copy}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function FailureLab() {
  const [mode, setMode] = useState<'gossip' | 'handoff' | 'merkle' | 'dc'>('gossip')
  const [round, setRound] = useState(0)
  return (
    <div className="failure-lab">
      <div className="failure-tabs">
        {[
          ['gossip', 'Gossip'],
          ['handoff', 'Hinted handoff'],
          ['merkle', 'Merkle repair'],
          ['dc', 'Multi-DC'],
        ].map(([id, label]) => (
          <button
            key={id}
            className={mode === id ? 'active' : ''}
            onClick={() => {
              setMode(id as typeof mode)
              setRound(0)
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === 'gossip' && (
        <div className="failure-panel gossip-panel">
          <div className="gossip-ring">
            {['S0', 'S1', 'S2', 'S3', 'S4'].map((node, index) => (
              <span className={`${node === 'S2' ? 'down' : ''} ${round >= index % 3 ? 'informed' : ''}`} key={node}>
                {node}
              </span>
            ))}
            <HeartPulse size={40} />
          </div>
          <div>
            <small>Membership round {round + 1}</small>
            <h3>{round < 2 ? 'Suspicion is spreading' : 'Peers agree S2 is stale'}</h3>
            <p>
              Nodes exchange membership IDs and heartbeat counters with random peers. A counter that stops increasing
              creates suspicion—not perfect proof.
            </p>
            <button onClick={() => setRound((current) => (current + 1) % 3)}>
              Run gossip round <RefreshCcw size={15} />
            </button>
          </div>
        </div>
      )}
      {mode === 'handoff' && (
        <div className="failure-panel handoff-panel">
          <div className="handoff-flow">
            <div>
              <Database /> S2 <X size={13} />
            </div>
            <ArrowRight />
            <div className="temporary-node">
              <Database /> S3
              <small>stores hint for S2</small>
            </div>
            <ArrowRight />
            <div>
              <RefreshCcw /> replay later
            </div>
          </div>
          <p>
            A sloppy quorum skips an unavailable preferred replica. S3 temporarily stores data and a hint, then hands
            it back when S2 recovers. Anti-entropy is still needed if hints expire or disappear.
          </p>
        </div>
      )}
      {mode === 'merkle' && (
        <div className="failure-panel merkle-panel">
          <div className="merkle-trees">
            {[1, 2].map((server) => (
              <div key={server}>
                <small>Server {server}</small>
                <span className="tree-root">root {server === 1 ? 'A7' : 'B2'}</span>
                <div>
                  <span>1–6 · 35A</span>
                  <span className="mismatch">7–12 · {server === 1 ? '8F0' : '91C'}</span>
                </div>
                <div>
                  <i>7–9</i>
                  <i className="mismatch">10–12</i>
                </div>
              </div>
            ))}
          </div>
          <p>
            Compare roots. Descend only through mismatching hashes until the bad bucket is found. Leaves must digest
            keys, versions or tombstones, and values—not keys alone.
          </p>
        </div>
      )}
      {mode === 'dc' && (
        <div className="failure-panel dc-panel">
          <div className="dc-map">
            <span>
              <Cloud /> US-East
            </span>
            <ArrowRight />
            <span>
              <Cloud /> EU-West
            </span>
            <ArrowRight />
            <span className="dc-down">
              <Cloud /> AP-South
            </span>
          </div>
          <p>
            Place replicas across failure domains. A complete data-center outage should not erase every copy, but
            cross-region consistency adds WAN latency, cost, and conflict decisions.
          </p>
        </div>
      )}
    </div>
  )
}

function StoragePathLab() {
  const [path, setPath] = useState<'write' | 'read'>('write')
  const writeSteps = [
    ['1', 'Commit log', 'Append the write to durable sequential storage.'],
    ['2', 'Memtable', 'Update the sorted in-memory structure.'],
    ['3', 'Acknowledge', 'Reply only after the chosen durability/quorum boundary.'],
    ['4', 'SSTable flush', 'When memory reaches a threshold, write an immutable sorted file.'],
  ]
  const readSteps = [
    ['1', 'Memtable/cache', 'Return immediately if the newest value is in memory.'],
    ['2', 'Bloom filters', 'Skip SSTables that definitely do not contain the key.'],
    ['3', 'Indexes + SSTables', 'Read candidate files; false positives may still require disk work.'],
    ['4', 'Reconcile', 'Choose or merge the newest valid version, then optionally repair replicas.'],
  ]
  const steps = path === 'write' ? writeSteps : readSteps
  return (
    <div className="storage-lab">
      <div className="storage-toggle segmented-control">
        <button className={path === 'write' ? 'active' : ''} onClick={() => setPath('write')}>
          put(key, value)
        </button>
        <button className={path === 'read' ? 'active' : ''} onClick={() => setPath('read')}>
          get(key)
        </button>
      </div>
      <div className="storage-pipeline">
        {steps.map(([number, title, copy], index) => (
          <div className="storage-step" key={title}>
            <span>{path === 'write' && index < 2 ? <HardDrive /> : path === 'read' && index < 2 ? <MemoryStick /> : <Layers3 />}</span>
            <small>Step {number}</small>
            <strong>{title}</strong>
            <p>{copy}</p>
            {index < steps.length - 1 && <ArrowRight className="storage-arrow" />}
          </div>
        ))}
      </div>
      {path === 'read' && (
        <ConceptNote title="Bloom filters can say “no,” never a certain “yes”">
          A negative result safely skips an SSTable. A positive result means “possibly present,” so the table’s index
          and data may still need checking.
        </ConceptNote>
      )}
      {path === 'write' && (
        <ConceptNote title="The acknowledgement boundary defines durability" tone="warning">
          Updating memory is not durable by itself. WAL fsync policy and replica acknowledgements decide which crashes
          an acknowledged write can survive.
        </ConceptNote>
      )}
    </div>
  )
}

export default function KeyValueModule() {
  return (
    <ModuleShell
      code="03"
      title="Design a Key-Value Store"
      subtitle="Start with put and get. End with a decentralized database that survives machines, networks, and regions failing."
      color="#0b9f8a"
      icon={<Database size={29} />}
      sections={SECTIONS}
    >
      <section className="module-section" id="kv-contract">
        <SectionIntro eyebrow="01 · The contract" title="A tiny API with enormous consequences">
          A unique key points to one opaque value. The simple interface hides partitioning, replication, consistency,
          repair, and storage.
        </SectionIntro>
        <div className="kv-api-card">
          <div>
            <code>put("last_logged_in_at", "2026-09-05")</code>
            <ArrowRight />
            <span>stored</span>
          </div>
          <div>
            <code>get("last_logged_in_at")</code>
            <ArrowRight />
            <span>"2026-09-05"</span>
          </div>
        </div>
        <div className="requirements-wheel">
          <div className="wheel-center">
            <Database />
            <strong>Key-value store</strong>
            <small>pairs &lt; 10 KB</small>
          </div>
          {['Huge data', 'High availability', 'Low latency', 'Automatic scale', 'Tunable consistency', 'No single node'].map(
            (item) => (
              <span key={item}>{item}</span>
            ),
          )}
        </div>
        <div className="single-server-story">
          <div>
            <MemoryStick />
            <strong>Memory hash table</strong>
            <span>fast, limited capacity</span>
          </div>
          <ArrowRight />
          <div>
            <HardDrive />
            <strong>Compress + cold data on disk</strong>
            <span>larger, but still one failure domain</span>
          </div>
          <ArrowRight />
          <div className="distributed-destination">
            <Network />
            <strong>Distribute</strong>
            <span>partition and replicate</span>
          </div>
        </div>
      </section>

      <section className="module-section module-tint" id="kv-cap">
        <SectionIntro eyebrow="02 · CAP under failure" title="The trade-off appears when the network breaks">
          CAP is not “pick any two” at all times. During a real partition, continuing to answer every request forces a
          choice between linearizable consistency and availability.
        </SectionIntro>
        <CapLab />
        <ConceptNote title="Three precise meanings">
          <strong>Consistency:</strong> operations behave like one current copy. <strong>Availability:</strong> every
          request to a non-failed node eventually receives a non-error response. <strong>Partition tolerance:</strong>{' '}
          the system has defined behavior despite lost or delayed messages.
        </ConceptNote>
      </section>

      <section className="module-section" id="kv-quorum">
        <SectionIntro eyebrow="03 · Partition & replicate" title="Place once, copy clockwise, wait for enough">
          Consistent hashing chooses an owner. The next N distinct physical servers hold replicas; topology-aware
          placement spreads copies across racks and data centers.
        </SectionIntro>
        <div className="partition-recap">
          <div>
            <CircleDot />
            <strong>Hash the key</strong>
            <span>place it on the ring</span>
          </div>
          <ArrowRight />
          <div>
            <Network />
            <strong>Walk clockwise</strong>
            <span>first server owns it</span>
          </div>
          <ArrowRight />
          <div>
            <Layers3 />
            <strong>Choose N unique servers</strong>
            <span>replicate across failure domains</span>
          </div>
        </div>
        <QuorumLab />
      </section>

      <section className="module-section dark-module-section" id="kv-conflict">
        <SectionIntro eyebrow="04 · Version conflicts" title="Two valid writes can disagree">
          Eventual consistency accepts that disconnected replicas may diverge. Vector clocks reveal causality; the
          application still decides what the merged value should mean.
        </SectionIntro>
        <VersionLab />
        <div className="clock-rules">
          <article>
            <Binary />
            <h3>Ancestor</h3>
            <p>Every component in Y is greater than or equal to X, so Y descends from X.</p>
            <code>[A:1, B:1] → [A:1, B:2]</code>
          </article>
          <article>
            <GitBranch />
            <h3>Concurrent siblings</h3>
            <p>Each vector is ahead in a different component. Neither one dominates.</p>
            <code>[A:1, B:2] ↔ [A:2, B:1]</code>
          </article>
        </div>
        <ConceptNote title="Vector clocks detect; they do not decide">
          They preserve causal history but cannot know whether “JohnSF,” “JohnNY,” both, or a business-specific merge
          is correct. Pruning long vectors can also lose causal information.
        </ConceptNote>
      </section>

      <section className="module-section" id="kv-failures">
        <SectionIntro eyebrow="05 · Handle failures" title="Failure detection, temporary cover, permanent repair">
          Large systems expect failures. Gossip spreads suspicions, hinted handoff covers temporary gaps, and
          anti-entropy repairs replicas that stay divergent.
        </SectionIntro>
        <FailureLab />
      </section>

      <section className="module-section module-tint" id="kv-storage">
        <SectionIntro eyebrow="06 · Read & write paths" title="Inside every symmetric storage node">
          Each node can coordinate, replicate, resolve conflicts, detect and repair failures, and run an LSM-style
          storage engine.
        </SectionIntro>
        <StoragePathLab />
        <div className="kv-recap-grid">
          {[
            ['Partition data', 'Consistent hashing + virtual nodes'],
            ['Keep copies', 'N replicas across failure domains'],
            ['Tune responses', 'Read and write quorums'],
            ['Resolve conflicts', 'Versions + vector clocks + business merge'],
            ['Detect failures', 'Gossip heartbeat membership'],
            ['Repair replicas', 'Hinted handoff + Merkle anti-entropy'],
            ['Write efficiently', 'Commit log → memtable → SSTable'],
            ['Read efficiently', 'Memory → Bloom filter → candidate SSTables'],
          ].map(([goal, method]) => (
            <div key={goal}>
              <Check size={15} />
              <span>
                <strong>{goal}</strong>
                {method}
              </span>
            </div>
          ))}
        </div>
      </section>
    </ModuleShell>
  )
}
