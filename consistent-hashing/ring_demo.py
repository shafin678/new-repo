#!/usr/bin/env python3
"""Step-by-step simulation of the ideas in "Design Consistent Hashing".

Run it with no arguments to walk through every lesson in order:

    python3 ring_demo.py

Or jump to one lesson:

    python3 ring_demo.py 4

Lessons:
    1  modulo hashing works fine while the server count is fixed
    2  ... and falls apart the moment a server disappears (the rehashing problem)
    3  the same failure at scale, measured on 10,000 keys
    4  the hash ring: how a key finds its server by walking clockwise
    5  adding a server to the ring
    6  removing a server from the ring
    7  the same add/remove at scale, measured on 10,000 keys
    8  why the basic ring is lumpy, and how virtual nodes fix it
    9  which range of keys is actually affected by a change

Lessons 4, 5, 6 and 9 use a hand-placed 360-point ring so the picture matches
Figures 5-5 to 5-9 and 5-14 to 5-15 of the chapter exactly. Lessons 3, 7 and 8
use real SHA-1 over the real 2^160 hash space, because those lessons are about
measuring what actually happens.

No third-party packages are needed.
"""

import bisect
import hashlib
import statistics
import sys

# SHA-1 produces a 160-bit number, so the real hash space is 0 .. 2**160 - 1.
# That whole space, bent into a circle, is the "hash ring".
RING_SIZE = 2 ** 160


def sha1_int(text):
    """Hash any string into a point on the ring: an integer in [0, RING_SIZE)."""
    return int(hashlib.sha1(text.encode()).hexdigest(), 16)


# The positions the chapter's own diagrams use, as clock angles: 0 is at the top
# and the numbers grow clockwise. Hand-picked, not hashed, purely so the drawings
# stay readable -- a real system would use sha1_int for all of these.
BOOK_RING = {
    "key0": 0,
    "server 4": 20,
    "server 0": 45,
    "key1": 100,
    "server 1": 135,
    "key2": 190,
    "server 2": 225,
    "key3": 280,
    "server 3": 315,
}


# --------------------------------------------------------------------------
# Lessons 1-3: plain modulo hashing, and why it breaks
# --------------------------------------------------------------------------

# These are the exact numbers printed in Table 5-1 of the chapter, so the
# output below can be compared line by line against the book.
BOOK_HASHES = {
    "key0": 18358617,
    "key1": 26143584,
    "key2": 18131146,
    "key3": 35863496,
    "key4": 34085809,
    "key5": 27581703,
    "key6": 38164978,
    "key7": 22530351,
}


def modulo_placement(server_names):
    """Where each key lands under serverIndex = hash(key) % N."""
    n = len(server_names)
    return {key: server_names[value % n] for key, value in BOOK_HASHES.items()}


def lesson_1():
    title("Lesson 1", "modulo hashing, while nothing changes")
    print("The rule is one line long:\n")
    print("    serverIndex = hash(key) % N          (N = how many servers we have)\n")
    print("With N = 4 servers, every key gets an index of 0, 1, 2 or 3, and that")
    print("index *is* the server that stores it.\n")

    print(f"{'key':<6} {'hash':>10}   {'hash % 4':>8}   stored on")
    print("-" * 46)
    for key, value in BOOK_HASHES.items():
        index = value % 4
        print(f"{key:<6} {value:>10}   {index:>8}   server {index}")

    print("\nSo the keys pile up like this (this is Figure 5-1 of the chapter):\n")
    show_buckets(modulo_placement(["server 0", "server 1", "server 2", "server 3"]))
    print("\nNothing is wrong here. Four servers, eight keys, two keys each.")
    print("A client that wants key0 does the division itself and talks straight to")
    print("server 1 -- no lookup table, no coordinator to ask. That convenience is")
    print("why the trick is popular in the first place.")


def lesson_2():
    title("Lesson 2", "the rehashing problem: server 1 dies")
    print("server 1 goes offline. The pool is now 3 servers, so the divisor")
    print("changes from 4 to 3. The hashes did NOT change -- only the '% N' did.\n")

    before = modulo_placement(["server 0", "server 1", "server 2", "server 3"])
    after = modulo_placement(["server 0", "server 2", "server 3"])

    print(f"{'key':<6} {'hash':>10}   {'% 4':>4} {'% 3':>4}   {'was on':<9} -> {'now on':<9}")
    print("-" * 58)
    moved = []
    for key, value in BOOK_HASHES.items():
        flag = ""
        if before[key] != after[key]:
            moved.append(key)
            flag = "   <-- MOVED"
        print(f"{key:<6} {value:>10}   {value % 4:>4} {value % 3:>4}   "
              f"{before[key]:<9} -> {after[key]:<9}{flag}")

    print("\nThe new pile-up. This is Figure 5-2, where the keys printed in red are")
    print("the ones marked with a star here:\n")
    show_buckets(after, highlight=moved)

    forced = [key for key, server in before.items() if server == "server 1"]
    print(f"\nOnly {len(forced)} keys actually lived on the dead server: {', '.join(forced)}.")
    print(f"Those {len(forced)} had no choice. But {len(moved)} keys moved: {', '.join(moved)}.")
    print(f"\nSo {len(moved) - len(forced)} keys moved for no reason whatsoever. Their server was")
    print("healthy and still holding their data. They were reassigned purely")
    print("because the divisor changed underneath them.")
    print("\nWhy this hurts so much: these are *caches*. A client computes hash % 3,")
    print("asks a server that has never seen the key, gets a miss, and falls through")
    print("to the database. Every client does this for most of its keys at the same")
    print("instant. That flood is the 'storm of cache misses' the chapter warns")
    print("about, and it is how one dead cache box takes the database down with it.")


def lesson_3():
    title("Lesson 3", "the same failure measured on 10,000 keys")
    keys = [f"user:{i}" for i in range(10_000)]

    def place(n):
        return {key: sha1_int(key) % n for key in keys}

    before, shrunk, grown = place(4), place(3), place(5)
    print("Real SHA-1 hashes this time. 10,000 keys, 4 servers.\n")
    print("Remove one server (4 -> 3):\n")
    report_move(keys, before, shrunk, forced=lambda k: before[k] == 1)
    print("\nAdd one server (4 -> 5):\n")
    report_move(keys, before, grown)
    print("\nThree quarters of the dataset is reshuffled to lose one quarter of the")
    print("servers, and four fifths is reshuffled to *gain* a server. Modulo hashing")
    print("spreads keys beautifully but cannot survive a change in N.")
    print("Consistent hashing keeps the even spread AND survives the change.")


def report_move(keys, before, after, forced=None):
    moved = sum(1 for key in keys if before[key] != after[key])
    print(f"  keys that changed server : {moved:>6,}  ({moved / len(keys):.1%})")
    if forced is not None:
        must = sum(1 for key in keys if forced(key))
        print(f"  keys that HAD to change  : {must:>6,}  ({must / len(keys):.1%})")


# --------------------------------------------------------------------------
# The hash ring itself
# --------------------------------------------------------------------------

class HashRing:
    """A consistent hash ring.

    vnodes is how many points on the ring each server occupies. vnodes=1 is the
    basic algorithm from Karger et al.; larger values are the "virtual nodes"
    refinement that evens out the load.

    hasher/space are swappable so the same class can drive both the tidy
    hand-placed diagrams and the real SHA-1 measurements.
    """

    def __init__(self, servers=(), vnodes=1, hasher=sha1_int, space=RING_SIZE):
        self.vnodes = vnodes
        self.hasher = hasher
        self.space = space
        self.owner_at = {}       # ring position -> real server name
        self.label_at = {}       # ring position -> the name that was hashed
        self.positions = []      # sorted ring positions, for binary search
        for server in servers:
            self.add(server)

    def _points_for(self, server):
        """The ring positions a server claims, as {label: position}."""
        if self.vnodes == 1:
            return {server: self.hasher(server)}
        return {f"{server}_{i}": self.hasher(f"{server}_{i}") for i in range(self.vnodes)}

    def add(self, server):
        for label, position in self._points_for(server).items():
            self.owner_at[position] = server
            self.label_at[position] = label
            bisect.insort(self.positions, position)

    def remove(self, server):
        for position in self._points_for(server).values():
            self.owner_at.pop(position, None)
            self.label_at.pop(position, None)
            self.positions.remove(position)

    def node_at_or_after(self, position):
        """Walk clockwise from a position to the first node. This is the whole rule."""
        if not self.positions:
            return None
        index = bisect.bisect_left(self.positions, position)
        if index == len(self.positions):
            index = 0                    # walked past the top of the ring, so wrap
        return self.positions[index]

    def previous_node(self, position):
        """Walk anticlockwise instead: used to find the range a node takes over."""
        index = bisect.bisect_left(self.positions, position)
        return self.positions[index - 1]     # index-1 == -1 wraps round for free

    def server_for(self, key):
        node = self.node_at_or_after(self.hasher(key))
        return None if node is None else self.owner_at[node]

    def node_label_for(self, key):
        node = self.node_at_or_after(self.hasher(key))
        return None if node is None else self.label_at[node]

    def share_of_ring(self, server):
        """Fraction of the hash space a server owns, adding up all of its arcs."""
        owned = 0
        for position in self.positions:
            if self.owner_at[position] == server:
                owned += (position - self.previous_node(position)) % self.space
        return owned / self.space


def unrolled_ring(ring, marks, width=96):
    """Cut the ring at 0 and lay it flat, one character per slice of hash space.

    Each character names the server that owns that slice, so the picture shows at
    a glance whether the space is being shared fairly. marks must be a stable
    {server: character} map, so the same server keeps the same character across
    before-and-after pictures.
    """
    row = []
    for i in range(width):
        node = ring.node_at_or_after(i * ring.space // width)
        row.append("." if node is None else marks[ring.owner_at[node]])
    live = [s for s in marks if any(v == s for v in ring.owner_at.values())]
    legend = "   ".join(f"{marks[s]} = {s}" for s in live)
    return "  0 |" + "".join(row) + "| end\n      " + legend


# --------------------------------------------------------------------------
# Lessons 4-7: the ring in action
# --------------------------------------------------------------------------

RING_SERVERS = ["server 0", "server 1", "server 2", "server 3"]
RING_KEYS = ["key0", "key1", "key2", "key3"]
MARKS = {"server 0": "0", "server 1": "1", "server 2": "2",
         "server 3": "3", "server 4": "4"}


def book_ring(servers, vnodes=1):
    """A ring using the chapter's hand-placed positions on a 360-point circle."""
    return HashRing(servers, vnodes=vnodes, hasher=BOOK_RING.__getitem__, space=360)


def lesson_4():
    title("Lesson 4", "the hash ring: keys find servers by walking clockwise")
    print("Two changes from Lesson 1, and together they are the entire idea:\n")
    print("  1. The '% N' is gone. Nothing in the arithmetic knows how many servers")
    print("     exist, so nothing can break when that number changes.")
    print("  2. Servers get hashed too. hash('server 0') is a point on the very")
    print("     same circle as hash('key0').\n")
    print("Then one rule does all the work: stand on the key's point, walk")
    print("clockwise, and the first server you bump into owns that key.\n")

    ring = book_ring(RING_SERVERS)
    print("Where everything sits (0 deg is 12 o'clock, angles grow clockwise):\n")
    for name in RING_SERVERS + RING_KEYS:
        print(f"  {name:<9} at {BOOK_RING[name]:>4} deg")

    print("\nNow walk clockwise from each key:\n")
    for key in RING_KEYS:
        start = BOOK_RING[key]
        owner = ring.server_for(key)
        gap = (BOOK_RING[owner] - start) % 360
        print(f"  {key} at {start:>3} deg -> walk {gap:>3} deg clockwise "
              f"-> hits {owner} at {BOOK_RING[owner]:>3} deg")
    print("\nThat is Figure 5-7: key0 on server 0, key1 on server 1, and so on.")

    print("\nThe same ring cut open at 0 and laid out flat:\n")
    print(unrolled_ring(ring, MARKS))
    print("\nRead it like a land map. Each run of the same digit is one server's")
    print("territory, and a key belongs to whichever territory it falls in. Notice")
    print("that a server owns the stretch *behind* it, ending at its own point,")
    print("because that is the stretch whose keys walk clockwise into it.")


def lesson_5():
    title("Lesson 5", "adding a server (Figure 5-8)")
    ring = book_ring(RING_SERVERS)
    before = {key: ring.server_for(key) for key in RING_KEYS}

    print("Before, with 4 servers:\n")
    print(unrolled_ring(ring, MARKS))

    ring.add("server 4")
    after = {key: ring.server_for(key) for key in RING_KEYS}
    print(f"\nserver 4 joins at {BOOK_RING['server 4']} deg, between key0 and server 0. After:\n")
    print(unrolled_ring(ring, MARKS))

    print("\nWhat happened to the keys:\n")
    for key in RING_KEYS:
        note = "MOVED" if before[key] != after[key] else "untouched"
        print(f"  {key}: {before[key]:<9} -> {after[key]:<9}  ({note})")

    print("\nOne key moved, out of four. Look at the flat map: server 4 carved its")
    print("territory out of server 0's stretch and nobody else's. key0 was in the")
    print("carved-out part, so it now walks clockwise into server 4 instead of")
    print("server 0. key1, key2 and key3 never even learn that server 4 exists,")
    print("because walking clockwise from them lands on the same server as before.")
    print("\nThis is the payoff. Under modulo hashing, adding a server rewrote the")
    print("answer for every key. Here it rewrites the answer for one slice of the")
    print("ring, and one server hands over one slice of its data.")


def lesson_6():
    title("Lesson 6", "removing a server (Figure 5-9)")
    ring = book_ring(RING_SERVERS)
    before = {key: ring.server_for(key) for key in RING_KEYS}

    print("Before, with 4 servers:\n")
    print(unrolled_ring(ring, MARKS))

    ring.remove("server 1")
    after = {key: ring.server_for(key) for key in RING_KEYS}
    print("\nserver 1 dies. After:\n")
    print(unrolled_ring(ring, MARKS))

    print("\nWhat happened to the keys:\n")
    for key in RING_KEYS:
        note = "MOVED" if before[key] != after[key] else "untouched"
        print(f"  {key}: {before[key]:<9} -> {after[key]:<9}  ({note})")

    print("\nAgain one key, and only the dead server's own key. Its territory did")
    print("not get chopped up and scattered; the next server clockwise (server 2)")
    print("simply absorbed the whole vacant stretch. Compare that with Lesson 2,")
    print("where one death dragged three innocent keys off healthy servers.")


def lesson_7():
    title("Lesson 7", "the ring measured on 10,000 keys")
    keys = [f"user:{i}" for i in range(10_000)]
    servers = [f"server {i}" for i in range(4)]

    print("Back to real SHA-1 and the same 10,000 keys as Lesson 3, so the numbers")
    print("are directly comparable. 4 servers, 100 virtual nodes each.\n")

    ring = HashRing(servers, vnodes=100)
    before = {key: ring.server_for(key) for key in keys}

    ring.remove("server 1")
    print("Remove one server (4 -> 3):\n")
    report_move(keys, before, {key: ring.server_for(key) for key in keys},
                forced=lambda k: before[k] == "server 1")
    print("  modulo hashing did       :  7,525  (75.2%)")
    print("\nThe two consistent-hashing numbers are identical, and that identity is")
    print("the whole claim: not one key moved that did not have to.\n")

    ring.add("server 1")
    ring.add("server 4")
    print("Add one server instead (4 -> 5):\n")
    report_move(keys, before, {key: ring.server_for(key) for key in keys})
    print("  modulo hashing did       :  8,014  (80.1%)")
    print("\n20% is exactly the newcomer's fair share of a 5-server cluster. It has")
    print("to be given some data, and it takes that data only from its neighbours.")
    print("This is the k/n in the Wikipedia definition the chapter quotes: k keys,")
    print("n slots, so k/n keys move -- rather than nearly all of them.")


# --------------------------------------------------------------------------
# Lesson 8: virtual nodes
# --------------------------------------------------------------------------

def lesson_8():
    title("Lesson 8", "the basic ring is lumpy, and virtual nodes smooth it out")
    servers = [f"server {i}" for i in range(4)]
    marks = {server: str(i) for i, server in enumerate(servers)}

    print("Everything so far used tidy hand-picked positions. Real hashing is not")
    print("tidy. Here are the same 4 servers placed by real SHA-1:\n")
    basic = HashRing(servers, vnodes=1)
    print(unrolled_ring(basic, marks))
    print()
    for server in servers:
        share = basic.share_of_ring(server)
        print(f"  {server} owns {share:6.1%} of the ring  {'#' * round(share * 60)}")
    print("\n  ...when a fair share would be 25.0% each.")

    print("\nProblem 1 from the chapter: the arcs between servers are random, so they")
    print("are never equal. One unlucky server here owns most of the circle, which")
    print("means most of the keys and most of the traffic.")
    print("\nProblem 2: because a server owns one single arc, when it dies that whole")
    print("arc is inherited by one neighbour, who is now serving a double-sized")
    print("territory (Figure 5-10). The failure of one box overloads the next.")

    print("\nThe fix is almost cheeky: stop giving a server one point on the ring.")
    print("Hash 'server 0_0', 'server 0_1', 'server 0_2' ... and treat every one of")
    print("those points as a door into the same real server 0. They are virtual")
    print("nodes. Because they are scattered independently, each server ends up")
    print("owning many small arcs all around the circle instead of one big gamble,")
    print("and the many small arcs average out.\n")

    print("Here is one 4-server cluster at a few different virtual node counts:\n")
    for vnodes in (1, 10, 200):
        ring = HashRing(servers, vnodes=vnodes)
        shares = [ring.share_of_ring(server) for server in servers]
        print(f"  {vnodes:>3} virtual node(s) each -> shares "
              f"{'  '.join(f'{s:5.1%}' for s in shares)}")

    print("\nTo summarise fairness as a single number, take the standard deviation of")
    print("those shares as a percentage of their mean. Standard deviation just")
    print("measures how scattered a set of numbers is, so a smaller value means the")
    print("servers are carrying more equal loads. Call it the 'spread'.")
    print("\nOne warning: a standard deviation computed from only 4 numbers is itself")
    print("very noisy, so a single cluster gives a jumpy, misleading curve. Each row")
    print("below is therefore averaged over 24 independently named clusters.\n")

    trials = 24
    for vnodes in (1, 2, 5, 10, 25, 50, 100, 200):
        measurements = []
        for trial in range(trials):
            cluster = [f"box-{trial}-{i}" for i in range(4)]
            ring = HashRing(cluster, vnodes=vnodes)
            shares = [ring.share_of_ring(server) for server in cluster]
            measurements.append(statistics.stdev(shares) / statistics.mean(shares))
        spread = statistics.mean(measurements)
        print(f"  {vnodes:>3} virtual node(s) each -> spread {spread:6.1%}"
              f"     (theory: 1/sqrt({vnodes}) = {vnodes ** -0.5:.1%})")

    print("\nThe spread falls away as 1 over the square root of the virtual node")
    print("count -- quadruple the virtual nodes and the unfairness halves. That is")
    print("why the chapter can quote roughly 10% at 100 virtual nodes and 5% at 200:")
    print("those are not magic numbers, they are 1/sqrt(100) and about 1/sqrt(200).")

    print("\nWith 10 virtual nodes each, the territory map is already interleaved,")
    print("and no single death can hand a huge arc to one neighbour:\n")
    print(unrolled_ring(HashRing(servers, vnodes=10), marks))

    print("\nThe cost is bookkeeping. 4 servers with 200 virtual nodes means 800")
    print("points to store, sort and binary-search instead of 4. That is the")
    print("tradeoff the chapter names: a bigger routing table buys a fairer spread,")
    print("and you pick the number that suits your system.")


# --------------------------------------------------------------------------
# Lesson 9: the affected range
# --------------------------------------------------------------------------

def lesson_9():
    title("Lesson 9", "which keys are affected (Figures 5-14 and 5-15)")
    print("Knowing that 'only a few keys move' is not enough to build the thing.")
    print("You need to name the exact keys, so you can copy just those. You never")
    print("scan the dataset: you look at the ring, and the answer is one arc.\n")

    print("ADDING server 4")
    print("  Stand on the newcomer's point and walk ANTICLOCKWISE to the first node")
    print("  you meet. The arc you just traced is precisely what it takes over.\n")
    ring = book_ring(RING_SERVERS)
    new_position = BOOK_RING["server 4"]
    predecessor = ring.previous_node(new_position)
    donor = ring.owner_at[ring.node_at_or_after(new_position)]
    print(f"    server 4 lands at              {new_position:>4} deg")
    print(f"    walk anticlockwise, first node {predecessor:>4} deg "
          f"({ring.owner_at[predecessor]})")
    print(f"    -> the affected arc is ({predecessor} deg .. {new_position} deg]")
    print(f"    -> {donor} copies the keys in that arc to server 4, and nothing else")
    print("       in the cluster moves a single byte.")
    print("    (the arc wraps past 0 here, which is fine -- it is a circle)\n")

    print("REMOVING server 1")
    print("  Exactly the same walk, starting from the dying server's point.\n")
    ring = book_ring(RING_SERVERS)
    dead_position = BOOK_RING["server 1"]
    predecessor = ring.previous_node(dead_position)
    ring.remove("server 1")
    inheritor = ring.owner_at[ring.node_at_or_after(dead_position)]
    print(f"    server 1 sat at                {dead_position:>4} deg")
    print(f"    walk anticlockwise, first node {predecessor:>4} deg "
          f"({ring.owner_at[predecessor]})")
    print(f"    -> the affected arc is ({predecessor} deg .. {dead_position} deg]")
    print(f"    -> {inheritor} is now responsible for every key in that arc")

    print("\nWith virtual nodes it is the same walk done once per virtual node. A")
    print("server with 200 of them hands over 200 tiny arcs to 200 different")
    print("neighbours, so a departure is absorbed by the whole cluster in thin")
    print("slices instead of dumped on one unlucky machine.")


# --------------------------------------------------------------------------
# small output helpers
# --------------------------------------------------------------------------

def title(tag, text):
    print("\n" + "=" * 78)
    print(f"{tag}: {text.upper()}")
    print("=" * 78 + "\n")


def show_buckets(placement, highlight=()):
    """Print the Figure 5-1 / 5-2 style one-column-per-server picture."""
    buckets = {}
    for key, server in placement.items():
        buckets.setdefault(server, []).append(key)
    servers = sorted(buckets)
    print("  " + "".join(f"{s:<14}" for s in servers))
    print("  " + "".join(f"{'-' * len(s):<14}" for s in servers))
    for row in range(max(len(v) for v in buckets.values())):
        line = ""
        for server in servers:
            keys = sorted(buckets[server])
            cell = ""
            if row < len(keys):
                cell = keys[row] + (" *" if keys[row] in highlight else "")
            line += f"{cell:<14}"
        print("  " + line.rstrip())
    if highlight:
        print("\n  * = moved to a different server")


LESSONS = [lesson_1, lesson_2, lesson_3, lesson_4, lesson_5,
           lesson_6, lesson_7, lesson_8, lesson_9]


def main():
    chosen = LESSONS
    if len(sys.argv) > 1:
        try:
            chosen = [LESSONS[int(sys.argv[1]) - 1]]
        except (ValueError, IndexError):
            print(f"Pick a lesson from 1 to {len(LESSONS)}.")
            return 1
    for lesson in chosen:
        lesson()
    print("\n" + "=" * 78)
    print("Now open index.html in a browser to drive the ring by hand.")
    print("=" * 78)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
