# Consistent Hashing, explained from zero

A beginner's companion to the chapter **"Design Consistent Hashing"**. It covers the same
ground as the chapter's Figures 5-1 to 5-15, but slows down at the places that usually trip
people up.

Three ways to learn it, use whichever suits you:

| What | How |
| --- | --- |
| Read it | this file, top to bottom |
| Run it | `python3 ring_demo.py` — 9 lessons that print real numbers |
| Play with it | open `index.html` in a browser and click things |

---

## 0. The problem in one paragraph

You have more data than one machine can hold, so you spread it over several machines. Now
every read has to answer one question first: **which machine has my data?**

You want that answer to be:

1. **Cheap** — no central directory to ask, just compute it.
2. **Even** — every machine gets roughly the same share of the data and traffic.
3. **Stable** — when you add or lose a machine, hardly anything has to move.

Getting 1 and 2 is easy. Getting 3 as well is what consistent hashing is for.

### First, what is a hash function?

A hash function is a meat grinder for data. Feed in any string, get out a big number.

```
hash("key0")      ->  18358617
hash("server 0")  ->  9915722301...
```

Three properties are all you need to remember:

- **Deterministic.** The same input always gives the same number. Every machine that runs
  `hash("key0")` gets `18358617`, with no coordination.
- **Evenly scattered.** Similar inputs give wildly different outputs, so hashes of real-world
  keys are sprinkled across the whole number range rather than clumped.
- **One-way and fixed-size.** You cannot get the key back, and the output is always the same
  width. SHA-1, the one the chapter uses, always produces a 160-bit number, so every output
  lands somewhere between `0` and `2^160 - 1`.

That last range is the only thing that matters for what follows. Call it the **hash space**.

---

## 1. The obvious approach: divide and take the remainder

You have 4 servers. A hash is a huge number. How do you turn a huge number into "server 0,
1, 2 or 3"? Take the remainder after dividing by 4.

```
serverIndex = hash(key) % N            N = number of servers
```

`%` is the *modulo* or remainder operator: `18358617 % 4 = 1`, because 4 goes into 18358617
exactly 4589654 times with 1 left over. A remainder after dividing by 4 can only ever be
0, 1, 2 or 3 — which is exactly the range of server numbers you needed. Neat.

Using the chapter's own numbers (Table 5-1):

| key | hash | `% 4` | lives on |
| --- | --- | --- | --- |
| key0 | 18358617 | 1 | server 1 |
| key1 | 26143584 | 0 | server 0 |
| key2 | 18131146 | 2 | server 2 |
| key3 | 35863496 | 0 | server 0 |
| key4 | 34085809 | 1 | server 1 |
| key5 | 27581703 | 3 | server 3 |
| key6 | 38164978 | 2 | server 2 |
| key7 | 22530351 | 3 | server 3 |

Which gives Figure 5-1:

```
   server 0        server 1        server 2        server 3
   --------        --------        --------        --------
   key1            key0            key2            key5
   key3            key4            key6            key7
```

Two keys each. Beautifully even. And a client needing `key0` does the division itself and
talks straight to server 1 — no lookup table, no coordinator to ask. This is genuinely a
good design, right up until the number of servers changes.

---

## 2. The rehashing problem: why this collapses

Server 1 dies. Now there are 3 servers, so `N` becomes 3, and every client starts computing
`hash(key) % 3` instead of `% 4`.

Here is the crucial thing to notice: **the hashes did not change.** `key3` still hashes to
`35863496`. The only thing that changed is what you divide by. But that is enough to change
the answer for almost everything.

| key | hash | `% 4` | `% 3` | was on | now on | |
| --- | --- | --- | --- | --- | --- | --- |
| key0 | 18358617 | 1 | 0 | server 1 | server 0 | moved (had to, server 1 is dead) |
| key1 | 26143584 | 0 | 0 | server 0 | server 0 | fine |
| key2 | 18131146 | 2 | 1 | server 2 | server 2 | fine |
| key3 | 35863496 | 0 | 2 | server 0 | server 3 | **moved for no reason** |
| key4 | 34085809 | 1 | 1 | server 1 | server 2 | moved (had to) |
| key5 | 27581703 | 3 | 0 | server 3 | server 0 | **moved for no reason** |
| key6 | 38164978 | 2 | 1 | server 2 | server 2 | fine |
| key7 | 22530351 | 3 | 0 | server 3 | server 0 | **moved for no reason** |

Only **2** keys actually lived on the dead server. But **5** keys changed server. Three keys
were yanked off perfectly healthy machines that were still holding their data, purely because
the divisor underneath them changed.

That is Figure 5-2, where the moved keys are printed in red.

At scale it is worse, not better. `ring_demo.py` lesson 3 hashes 10,000 keys for real:

```
Remove one server (4 -> 3):
  keys that changed server :  7,525  (75.2%)
  keys that HAD to change  :  2,471  (24.7%)

Add one server (4 -> 5):
  keys that changed server :  8,014  (80.1%)
```

**Three quarters of the dataset is reshuffled to lose one server. Four fifths is reshuffled
to gain one.**

### Why this is a catastrophe and not just an inconvenience

These are caches. So the sequence of events when server 1 dies is:

1. Every client switches to `% 3` at roughly the same moment.
2. For ~75% of keys, that points at a server which has never seen the key.
3. That server returns a miss.
4. The client falls through to the database.

Every client, for most of its keys, all at once. The database gets hit with something close
to your entire read traffic with no cache in front of it. This is the **"storm of cache
misses"** the chapter warns about, and it is how one dead cache box takes the database down
with it.

The cache is not even *wrong* — server 0 still has `key3` sitting in memory, correct and
ready. Nobody asks it any more. The data did not move; the *addressing scheme* moved.

> **The root cause, in one line:** `N` is baked into every single answer. Change `N` and you
> change every answer.

Everything that follows is one idea: **get `N` out of the formula.**

---

## 3. The fix, step 1: bend the hash space into a circle

The hash space is the range `0 .. 2^160 - 1`. Draw it as a line (Figure 5-3):

```
   0 ------------------------------------------------------ 2^160-1
```

Now glue the two ends together, so that the moment you walk past the end you are back at 0
(Figure 5-4):

```
                      0 / 2^160-1
                          ...
                     .         .
                   .             .
                  .               .
                  .               .     <- every hash lands
                   .             .          somewhere on this circle
                     .         .
                          ...
```

This is the **hash ring**. Nothing has happened yet — it is the same set of numbers, just
drawn as a loop instead of a line. Making it a loop matters for exactly one reason: it means
"keep going forwards" never runs out of room. You can always keep walking.

### Step 2: put the servers on the same circle

Here is the move that makes everything work. Instead of numbering servers 0, 1, 2, 3, **hash
them too** — hash the server's name or IP address and put it on the ring, right alongside the
keys (Figure 5-5).

```
hash("server 0") -> some point on the circle
hash("server 1") -> some other point on the circle
```

Both keys and servers are now just points on one circle, and **nowhere in that computation
does the number of servers appear.** `hash("server 0")` gives the same answer whether the
cluster has 3 servers or 300. That is the whole trick. There is no `% N` left to break.

Note the other quiet change: there is **no modulo operation at all** now. The chapter flags
this explicitly — the hashing here is doing a different job than in section 1.

---

## 4. The lookup rule

> **Stand on the key's point. Walk clockwise. The first server you bump into owns that key.**

That is the entire algorithm. Read it twice, because everything else in this document is a
consequence of it.

Using the chapter's layout from Figures 5-6 and 5-7 (angles on a clock face, 0 at the top,
growing clockwise):

```
   key0 at   0 deg  --walk  45 deg-->  server 0 at  45 deg
   key1 at 100 deg  --walk  35 deg-->  server 1 at 135 deg
   key2 at 190 deg  --walk  35 deg-->  server 2 at 225 deg
   key3 at 280 deg  --walk  35 deg-->  server 3 at 315 deg
```

It helps enormously to flip this around and think in terms of **territory**. If keys walk
clockwise to reach a server, then a server owns every point in the stretch *behind* it,
ending at its own position. Cut the ring open at 0 and lay it flat:

```
  0 |0000000000000111111111111111111111111222222222222222222222222333333333333333333333333000000000| end
      ^^^^^^^^^^^^^                        ^
      server 0's territory,                server 2 sits here, and owns
      ending at server 0's own point       everything back to server 1
```

Now it is a map. Each server owns a contiguous arc of the hash space, and a key belongs to
whichever arc it lands in. Server 0's territory wraps around past the end and back to the
start, which is fine — it is a circle, the "end" is an arbitrary cut.

Practically, a client stores the sorted list of server positions and binary-searches it. With
4 servers that is 4 numbers; the lookup is a handful of comparisons. Still cheap, still no
coordinator.

---

## 5. Adding a server (Figure 5-8)

`server 4` joins and lands between `key0` and `server 0`.

```
before:  0 |0000000000000111111111111111111111111222222222222222222222222333333333333333333333333000000000| end
after:   0 |4444440000000111111111111111111111111222222222222222222222222333333333333333333333333444444444| end
             ^^^^^^                                                                              ^^^^^^^^^
             server 4 carved its territory out of server 0's stretch, and nobody else's
```

| key | before | after | |
| --- | --- | --- | --- |
| key0 | server 0 | **server 4** | moved |
| key1 | server 1 | server 1 | untouched |
| key2 | server 2 | server 2 | untouched |
| key3 | server 3 | server 3 | untouched |

**One key out of four moved.** Compare with section 2, where adding a server rewrote the
answer for 80% of keys.

Why do the others not move? Because walking clockwise from `key1` still hits `server 1`
first. The new server is somewhere else entirely on the circle, so it is not in `key1`'s path.
`key1` does not just avoid moving — it never learns that `server 4` exists.

Only **one** server hands over data, and it hands over only the slice that `server 4` now
covers. Every other server does nothing.

---

## 6. Removing a server (Figure 5-9)

`server 1` dies.

```
before:  0 |0000000000000111111111111111111111111222222222222222222222222333333333333333333333333000000000| end
after:   0 |0000000000000222222222222222222222222222222222222222222222222333333333333333333333333000000000| end
                          ^^^^^^^^^^^^^^^^^^^^^^^
                          server 2 absorbed the vacant stretch
```

| key | before | after | |
| --- | --- | --- | --- |
| key0 | server 0 | server 0 | untouched |
| key1 | **server 1** | **server 2** | moved |
| key2 | server 2 | server 2 | untouched |
| key3 | server 3 | server 3 | untouched |

One key again, and only the dead server's own key. Its territory was not chopped up and
scattered across the cluster; the next server clockwise simply inherited the whole vacant
arc. Keys that walked clockwise into `server 1` now walk a little further and reach
`server 2`.

Contrast with section 2, where one death dragged three innocent keys off healthy servers.

### At scale, and why the numbers are what the theory predicts

`ring_demo.py` lesson 7, same 10,000 keys as before:

```
Remove one server (4 -> 3):
  keys that changed server :  2,427  (24.3%)
  keys that HAD to change  :  2,427  (24.3%)     <- identical
  modulo hashing did       :  7,525  (75.2%)

Add one server (4 -> 5):
  keys that changed server :  2,001  (20.0%)
  modulo hashing did       :  8,014  (80.1%)
```

Those first two numbers being **identical** is the whole claim of consistent hashing: not one
key moved that did not have to.

And 20% for a 4→5 growth is not a coincidence, it is exactly the newcomer's fair share of a
5-server cluster. This is the `k/n` in the Wikipedia definition the chapter quotes: with `k`
keys and `n` slots, about `k/n` keys move — instead of nearly all of them.

---

## 7. Two problems with the basic ring

The version above is the original algorithm from Karger et al. at MIT. It has two real flaws,
and both come from the same source: **the arcs between servers are random, and random is not
the same as even.**

The tidy diagrams above were hand-placed to be readable. Here are 4 servers placed by actual
SHA-1 (`ring_demo.py` lesson 8):

```
  0 |333333333333333333000111111111111111111111111111111111111111111111111111111111112222222222222223| end

  server 0 owns   2.9% of the ring  ##
  server 1 owns  61.4% of the ring  #####################################
  server 2 owns  15.5% of the ring  #########
  server 3 owns  20.2% of the ring  ############

  ...when a fair share would be 25.0% each.
```

**Problem 1: unfair partitions.** With only 4 random points on a circle, the gaps between
them are wildly unequal. `server 1` here owns 61% of the hash space — which means 61% of the
keys and 61% of the traffic, while `server 0` idles with 2.9%. This is what Figure 5-11
illustrates: servers bunched together, so most keys land on one of them and others get nothing.

**Problem 2: failure creates a hotspot.** Because each server owns one single arc, when it
dies that entire arc is inherited by one neighbour. That neighbour's territory can double
instantly (Figure 5-10, where `s2`'s partition becomes twice `s0`'s and `s3`'s). Your cluster
just lost a machine and rewarded the survivor next to it with double load — which is a fine
way to make it fall over too, and then its neighbour, and so on.

Note that adding more servers does not fix this. Random points are always lumpy. You need to
change something structural.

---

## 8. Virtual nodes: the fix for both problems

The fix is almost cheeky.

> **Stop giving each server one point on the ring. Give it many.**

Instead of hashing `"server 0"` once, hash `"server 0_0"`, `"server 0_1"`, `"server 0_2"`,
and so on. Each of those is a **virtual node**: a separate point on the ring that is just a
door into the same real `server 0` (Figure 5-12).

```
   real machines                ring
   ------------                 ----
   server 0   ---+---->  s0_0 at 137 deg
                 +---->  s0_1 at 202 deg
                 +---->  s0_2 at 301 deg

   server 1   ---+---->  s1_0 at  44 deg
                 +---->  s1_1 at 189 deg
                 +---->  s1_2 at 275 deg
```

Nothing about the lookup rule changes at all. You still stand on the key, walk clockwise, and
take the first node you meet — you just then follow that node's label back to the real machine
it belongs to. In Figure 5-13, `k0` walks clockwise, hits `s1_1`, and `s1_1` means `server 1`,
so `server 1` stores `k0`.

**Why this fixes problem 1.** A server's share is now the *sum* of many small arcs instead of
one big gamble. One unlucky small arc no longer matters, because it is averaged against dozens
of others. The same 4 servers as above:

```
    1 virtual node  each -> shares  2.9%  61.4%  15.5%  20.2%
   10 virtual nodes each -> shares 22.1%  13.7%  26.5%  37.7%
  200 virtual nodes each -> shares 24.1%  24.0%  25.6%  26.3%
```

One subtlety worth getting straight, because it is easy to misread the table above: virtual
nodes do not make a *particular* layout better. If you got lucky and your 4 servers happened to
land at almost exactly 90 degrees apart, adding virtual nodes would make your split slightly
*worse*, by dragging it back toward the average. What virtual nodes buy is that you no longer
need luck. They shrink the range of possible outcomes, so a bad roll becomes impossible. They
make a good layout **reliable** rather than making a lucky layout better — and in production you
do not get to choose your roll.

**Why this fixes problem 2.** A server's territory is no longer one contiguous arc but dozens
of thin slices scattered all around the circle, each with a different neighbour clockwise of
it. So when the server dies, its load is not dumped on one machine — it is split into dozens
of pieces and absorbed by the whole cluster in thin slivers.

```
  4 servers, 10 virtual nodes each -- territory is now interleaved:
  0 |333332200000013333333313333111112222223330333100000202223201122222222222011113333300000033313333| end
```

### How many virtual nodes? The number the chapter quotes, and where it comes from

To score fairness with a single number, take the **standard deviation** of the servers' shares
as a percentage of the mean. Standard deviation just measures how scattered a set of numbers
is, so a smaller value means the servers are carrying more equal loads. Call it the *spread*.

One statistical trap worth knowing: a standard deviation computed from only 4 numbers is
itself extremely noisy, so measuring one cluster gives a jumpy curve that can even appear to
get *worse* with more virtual nodes. Averaging over 24 independently named clusters shows the
real trend (`ring_demo.py` lesson 8):

```
    1 virtual node(s) each -> spread  87.1%     (theory: 1/sqrt(1)   = 100.0%)
    2 virtual node(s) each -> spread  57.4%     (theory: 1/sqrt(2)   =  70.7%)
    5 virtual node(s) each -> spread  42.9%     (theory: 1/sqrt(5)   =  44.7%)
   10 virtual node(s) each -> spread  32.2%     (theory: 1/sqrt(10)  =  31.6%)
   25 virtual node(s) each -> spread  21.4%     (theory: 1/sqrt(25)  =  20.0%)
   50 virtual node(s) each -> spread  11.1%     (theory: 1/sqrt(50)  =  14.1%)
  100 virtual node(s) each -> spread   9.8%     (theory: 1/sqrt(100) =  10.0%)
  200 virtual node(s) each -> spread   5.9%     (theory: 1/sqrt(200) =   7.1%)
```

The spread falls as **1 over the square root of the virtual node count**. Quadruple the
virtual nodes and you halve the unfairness. So the chapter's "5% at 200 virtual nodes, 10% at
100" are not magic constants anybody had to discover — they are `1/sqrt(100)` and roughly
`1/sqrt(200)`.

The square root is also why you stop somewhere around a few hundred. Going from 1 to 100
virtual nodes takes you from unusable to ~10%. Going from 100 to 10,000 would only take you
from 10% to 1%, at 100 times the bookkeeping.

**The tradeoff.** 4 servers with 200 virtual nodes each means 800 points to store, sort and
binary-search on every client, instead of 4. You are buying fairness with memory and lookup
time. The chapter's advice is exactly right: it is a knob, and you tune it to your system.

A bonus that falls out of this: virtual nodes also let you run **mixed hardware**. Want a
machine with twice the RAM to hold twice the data? Give it twice as many virtual nodes.

---

## 9. Finding the affected keys (Figures 5-14 and 5-15)

Knowing that "only a few keys move" is not enough to actually build this. When a server joins,
somebody has to copy real data to it, so you need to name *exactly which* keys. You never scan
the dataset — you look at the ring, and the answer is one arc.

The rule is the lookup rule, run backwards:

> **Stand on the node that is joining or leaving, and walk *anticlockwise* to the first other
> node. That arc is the affected range.**

**Adding `server 4`:**

```
    server 4 lands at              20 deg
    walk anticlockwise, first node 315 deg (server 3)
    -> affected arc: (315 deg .. 20 deg]        (wraps past 0, which is fine)
    -> server 0 copies the keys in that arc to server 4
    -> nothing else in the cluster moves a single byte
```

Why anticlockwise? Because that arc is precisely the set of points that *used* to walk
clockwise past `server 4`'s position to reach `server 0`, and now stop at `server 4` instead.
It is the territory the newcomer took, so it is the data it needs.

**Removing `server 1`:**

```
    server 1 sat at                135 deg
    walk anticlockwise, first node  45 deg (server 0)
    -> affected arc: (45 deg .. 135 deg]
    -> server 2 is now responsible for every key in that arc
```

With virtual nodes it is the same walk, done once per virtual node. A departing server with
200 virtual nodes hands over 200 tiny arcs to 200 different neighbours. That is the mechanism
that stops a failure from creating a hotspot — spelled out as an algorithm.

---

## 10. Recap, and why anyone cares

The chapter's own summary of the benefits, now with the reasons attached:

- **Minimal key movement on a change.** Only the keys in one arc move, roughly `k/n` of them,
  because a change only rewrites one arc of the ring instead of the whole formula.
- **Easy horizontal scaling.** Adding capacity costs one arc's worth of data transfer, so you
  can grow the cluster during business hours instead of planning an outage.
- **Hotspot mitigation.** With enough virtual nodes, popular data is spread across many small
  arcs rather than piling into one shard. The chapter's example: Katy Perry, Justin Bieber and
  Lady Gaga all landing on the same shard and melting it.

Where it is used in the real world (the chapter's list):

- Amazon **Dynamo** — the partitioning component
- Apache **Cassandra** — data partitioning across the cluster
- **Discord** — chat application
- **Akamai** — content delivery network
- **Maglev** — Google's network load balancer

### If you have to explain it in an interview

> Modulo hashing spreads keys evenly but bakes the server count into every answer, so changing
> the cluster size remaps almost every key and triggers a cache-miss storm. Consistent hashing
> puts the hash space on a circle and hashes the servers onto that same circle. A key belongs
> to the first server clockwise of it. Adding or removing a server only changes ownership of
> one arc, so only about `k/n` keys move. Because a handful of random points on a circle are
> never evenly spaced, each server is given many virtual nodes instead of one, which evens out
> the load and makes sure a failure is absorbed by the whole cluster rather than by one
> neighbour.

---

## 11. Things that commonly confuse people

**"Where is the data actually stored — on the ring?"**
No. The ring is not storage, it is arithmetic. It is a shared mental model that lets any client
compute an answer with no lookup. The data sits on ordinary servers.

**"Why clockwise? Would anticlockwise work?"**
Yes, perfectly well. Clockwise is a convention. All that matters is that everyone agrees, and
that the direction is consistent.

**"Why a circle at all? Why not just 'nearest server'?"**
Because "nearest" needs a tie-break rule and gets fiddly at the wrap point. "First one
clockwise" is unambiguous everywhere, needs no special case, and is one binary search.

**"Does the key's hash need to be close to the server's hash?"**
No. `key3` might be at 280 degrees and its server at 315. They are unrelated numbers that
happen to be neighbours on the circle. Ownership is about *order*, not closeness.

**"Do virtual nodes mean more machines?"**
No. `s0_0`, `s0_1` and `s0_2` are three entries in a sorted list, all pointing at the same
physical box. It is bookkeeping, not hardware.

**"If a server dies, is its data lost?"**
Consistent hashing only answers *where data belongs*, not *how many copies exist*. It says
nothing about durability. In a cache, a death means misses until the new owner warms up. In a
database like Cassandra or Dynamo, you replicate — and the ring gives you a natural way to
choose replicas: walk clockwise and take the next N distinct servers.

**"Removing a server moved 24% of keys in the test. Isn't that a lot?"**
That 24% *is* the data that lived on the dead machine. It has to be re-fetched or re-served by
somebody. The claim is not that nothing moves — it is that **nothing unnecessary** moves. In
lesson 7 the "keys that changed" and "keys that had to change" numbers are identical, which is
exactly the point.

---

## Files

| File | What it is |
| --- | --- |
| `README.md` | this walkthrough |
| `ring_demo.py` | 9 runnable lessons, stdlib only. `python3 ring_demo.py` for all, `python3 ring_demo.py 5` for one |
| `index.html` | interactive ring — click keys to watch the clockwise walk, toggle servers, drag the virtual node slider |
