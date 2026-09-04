const TOTAL_STEPS = 6;
const COLORS = {
  A: "#65b999",
  B: "#88bde8",
  C: "#ad9ee8",
  D: "#f4d56b",
};

let currentStep = 0;
let moduloReduced = false;
let serverDAdded = false;
let activeRouteKey = null;

const chapters = [...document.querySelectorAll(".chapter")];
const panels = [...document.querySelectorAll(".lesson-panel")];
const stepDots = document.getElementById("stepDots");

function showStep(index, shouldScroll = false) {
  currentStep = Math.max(0, Math.min(TOTAL_STEPS - 1, index));
  chapters.forEach((chapter, i) => chapter.classList.toggle("active", i === currentStep));
  panels.forEach((panel, i) => panel.classList.toggle("active", i === currentStep));
  [...stepDots.children].forEach((dot, i) => dot.classList.toggle("active", i === currentStep));

  const percent = Math.round(((currentStep + 1) / TOTAL_STEPS) * 100);
  document.getElementById("progressText").textContent = `${currentStep + 1} of ${TOTAL_STEPS}`;
  document.getElementById("progressPercent").textContent = `${percent}%`;
  document.getElementById("progressBar").style.width = `${percent}%`;
  document.getElementById("prevStep").disabled = currentStep === 0;
  document.getElementById("nextStep").textContent =
    currentStep === TOTAL_STEPS - 1 ? "Review summary ↓" : "Next chapter →";

  localStorage.setItem("hash-ring-step", String(currentStep));
  if (shouldScroll) {
    document.querySelector(".lesson-layout").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

for (let i = 0; i < TOTAL_STEPS; i += 1) {
  const dot = document.createElement("button");
  dot.type = "button";
  dot.setAttribute("aria-label", `Go to chapter ${i + 1}`);
  dot.addEventListener("click", () => showStep(i));
  stepDots.appendChild(dot);
}

chapters.forEach((chapter) => {
  chapter.addEventListener("click", () => showStep(Number(chapter.dataset.step)));
});

document.querySelectorAll("[data-go-step]").forEach((button) => {
  button.addEventListener("click", () => showStep(Number(button.dataset.goStep), true));
});

document.getElementById("prevStep").addEventListener("click", () => showStep(currentStep - 1));
document.getElementById("nextStep").addEventListener("click", () => {
  if (currentStep === TOTAL_STEPS - 1) {
    document.querySelector(".cheatsheet").scrollIntoView({ behavior: "smooth" });
  } else {
    showStep(currentStep + 1);
  }
});

document.getElementById("resetCourse").addEventListener("click", () => {
  moduloReduced = false;
  serverDAdded = false;
  activeRouteKey = null;
  renderModulo();
  renderRouteRing();
  renderChangeRing();
  resetQuiz();
  showStep(0, true);
});

// Chapter 1: show why modulo hashing remaps many keys.
const moduloKeys = [
  ["ant", 13],
  ["bee", 22],
  ["cat", 37],
  ["dog", 51],
  ["eel", 68],
  ["fox", 79],
  ["gnu", 94],
  ["hare", 107],
  ["ibis", 121],
  ["jay", 138],
  ["kiwi", 155],
  ["lynx", 173],
];

function renderModulo() {
  const grid = document.getElementById("moduloGrid");
  grid.innerHTML = "";
  let moved = 0;

  moduloKeys.forEach(([key, hash]) => {
    const before = "ABCD"[hash % 4];
    const after = "ABC"[hash % 3];
    const didMove = moduloReduced && before !== after;
    if (didMove) moved += 1;

    const chip = document.createElement("div");
    chip.className = `key-chip${didMove ? " moved" : ""}`;
    chip.innerHTML = `<small>${key}</small><strong>${moduloReduced ? after : before}</strong>`;
    chip.title = `hash ${hash} → server ${moduloReduced ? after : before}`;
    grid.appendChild(chip);
  });

  document.getElementById("moduloImpact").textContent = `${moved} of ${moduloKeys.length}`;
  document.getElementById("toggleModulo").textContent = moduloReduced
    ? "Restore server D"
    : "Remove server D";
  document.getElementById("moduloHint").textContent = moduloReduced
    ? "The changed divisor sends most keys to a different server—even keys nowhere near D."
    : "All four servers are online. Notice each key's home.";
}

document.getElementById("toggleModulo").addEventListener("click", () => {
  moduloReduced = !moduloReduced;
  renderModulo();
});

// Shared ring helpers. Position 0 is at the top and values increase clockwise.
function pointAt(position, radius = 164, center = 220) {
  const angle = (position / 256) * Math.PI * 2 - Math.PI / 2;
  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
  };
}

function arcPath(start, end, radius = 164) {
  const startPoint = pointAt(start, radius);
  const endPoint = pointAt(end, radius);
  const distance = (end - start + 256) % 256 || 256;
  const largeArc = distance > 128 ? 1 : 0;
  return `M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${largeArc} 1 ${endPoint.x} ${endPoint.y}`;
}

function ownerFor(position, nodes) {
  const sorted = [...nodes].sort((a, b) => a.position - b.position);
  return sorted.find((node) => node.position >= position) || sorted[0];
}

function svgElement(name, attributes = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function drawBaseRing(svg, nodes) {
  svg.innerHTML = "";
  svg.appendChild(svgElement("circle", { cx: 220, cy: 220, r: 164, class: "ring-base" }));

  const sorted = [...nodes].sort((a, b) => a.position - b.position);
  sorted.forEach((node, index) => {
    const previous = sorted[(index - 1 + sorted.length) % sorted.length];
    const arc = svgElement("path", {
      d: arcPath(previous.position, node.position),
      class: "ring-arc",
      stroke: COLORS[node.name],
    });
    svg.appendChild(arc);
  });

  [0, 64, 128, 192].forEach((tick) => {
    const point = pointAt(tick, 198);
    const text = svgElement("text", {
      x: point.x,
      y: point.y,
      class: "ring-tick",
      "text-anchor": "middle",
      "dominant-baseline": "middle",
    });
    text.textContent = tick;
    svg.appendChild(text);
  });

  sorted.forEach((node) => {
    const point = pointAt(node.position);
    const marker = svgElement("circle", {
      cx: point.x,
      cy: point.y,
      r: 13,
      fill: COLORS[node.name],
      class: "node-marker",
    });
    svg.appendChild(marker);

    const labelPoint = pointAt(node.position, 133);
    const label = svgElement("text", {
      x: labelPoint.x,
      y: labelPoint.y,
      class: "node-label",
      "text-anchor": "middle",
      "dominant-baseline": "middle",
    });
    label.textContent = `server ${node.name}`;
    svg.appendChild(label);
  });
}

const routeNodes = [
  { name: "A", position: 28 },
  { name: "B", position: 108 },
  { name: "C", position: 196 },
];
const routeKeys = [
  { name: "owl", position: 72 },
  { name: "map", position: 151 },
  { name: "sun", position: 224 },
  { name: "ink", position: 9 },
];

function renderRouteRing() {
  const svg = document.getElementById("routeRing");
  drawBaseRing(svg, routeNodes);

  if (activeRouteKey) {
    const key = routeKeys.find((item) => item.name === activeRouteKey);
    const owner = ownerFor(key.position, routeNodes);
    svg.appendChild(
      svgElement("path", {
        d: arcPath(key.position, owner.position, 184),
        class: "route-path",
      }),
    );

    const point = pointAt(key.position, 184);
    svg.appendChild(
      svgElement("circle", {
        cx: point.x,
        cy: point.y,
        r: 8,
        fill: "#f3a56f",
        class: "key-marker",
      }),
    );
    const labelPoint = pointAt(key.position, 210);
    const label = svgElement("text", {
      x: labelPoint.x,
      y: labelPoint.y,
      class: "key-label",
      "text-anchor": "middle",
    });
    label.textContent = `${key.name} · ${key.position}`;
    svg.appendChild(label);
    document.getElementById("routeResult").textContent = `${key.name} → server ${owner.name}`;
  } else {
    document.getElementById("routeResult").textContent = "Choose a key";
  }

  document.querySelectorAll("#routeKeys button").forEach((button) => {
    button.classList.toggle("active", button.dataset.key === activeRouteKey);
  });
}

const routeKeyButtons = document.getElementById("routeKeys");
routeKeys.forEach((key) => {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.key = key.name;
  button.textContent = `${key.name} · hash ${key.position}`;
  button.addEventListener("click", () => {
    activeRouteKey = key.name;
    renderRouteRing();
  });
  routeKeyButtons.appendChild(button);
});

// Chapter 4: compare ownership before and after server D joins.
const baseNodes = [
  { name: "A", position: 24 },
  { name: "B", position: 101 },
  { name: "C", position: 201 },
];
const addedNode = { name: "D", position: 154 };
const changeKeys = [7, 35, 63, 88, 119, 137, 148, 174, 213, 239];

function renderChangeRing() {
  const svg = document.getElementById("changeRing");
  const currentNodes = serverDAdded ? [...baseNodes, addedNode] : baseNodes;
  drawBaseRing(svg, currentNodes);

  let moved = 0;
  changeKeys.forEach((position, index) => {
    const before = ownerFor(position, baseNodes);
    const after = ownerFor(position, currentNodes);
    const didMove = serverDAdded && before.name !== after.name;
    if (didMove) moved += 1;

    const point = pointAt(position, 184);
    const marker = svgElement("circle", {
      cx: point.x,
      cy: point.y,
      r: 6,
      fill: "#f3a56f",
      class: `key-marker${didMove ? " moved" : ""}`,
    });
    const title = svgElement("title");
    title.textContent = `key ${index + 1}: ${before.name}${didMove ? ` → ${after.name}` : ""}`;
    marker.appendChild(title);
    svg.appendChild(marker);
  });

  document.getElementById("movedCount").textContent = `${moved} / ${changeKeys.length}`;
  document.getElementById("moveSummary").textContent = serverDAdded
    ? "Only D's new arc moved"
    : "Before the change";
  document.getElementById("toggleServer").textContent = serverDAdded
    ? "− Remove server D"
    : "+ Add server D";
}

document.getElementById("toggleServer").addEventListener("click", () => {
  serverDAdded = !serverDAdded;
  renderChangeRing();
});

// Chapter 5: deterministic load simulation for physical and virtual nodes.
function hash32(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  hash += hash << 13;
  hash ^= hash >>> 7;
  hash += hash << 3;
  hash ^= hash >>> 17;
  hash += hash << 5;
  return hash >>> 0;
}

function distributionFor(vnodeCount) {
  const names = ["A", "B", "C", "D"];
  let nodes = [];
  if (vnodeCount === 1) {
    nodes = [
      { name: "A", position: 0.04 },
      { name: "B", position: 0.18 },
      { name: "C", position: 0.7 },
      { name: "D", position: 0.86 },
    ];
  } else {
    names.forEach((name) => {
      for (let i = 0; i < vnodeCount; i += 1) {
        nodes.push({ name, position: hash32(`${name}:vnode:${i}`) / 2 ** 32 });
      }
    });
  }
  nodes.sort((a, b) => a.position - b.position);

  const counts = Object.fromEntries(names.map((name) => [name, 0]));
  for (let keyIndex = 0; keyIndex < 100; keyIndex += 1) {
    const position = hash32(`sample-key:${keyIndex}`) / 2 ** 32;
    const owner = nodes.find((node) => node.position >= position) || nodes[0];
    counts[owner.name] += 1;
  }
  return counts;
}

function renderBalance(vnodeCount) {
  const counts = distributionFor(vnodeCount);
  const bars = document.getElementById("balanceBars");
  bars.innerHTML = "";

  Object.entries(counts).forEach(([name, count]) => {
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `
      <span class="bar-name">Server ${name}</span>
      <div class="bar-track"><div class="bar-fill" style="width: 0; background: ${COLORS[name]}"></div></div>
      <span class="bar-value">${count}%</span>
    `;
    bars.appendChild(row);
    requestAnimationFrame(() => {
      row.querySelector(".bar-fill").style.width = `${count}%`;
    });
  });

  document.getElementById("balanceVerdict").textContent =
    vnodeCount === 1 ? "Uneven distribution" : "Much more even";
  document.querySelectorAll("[data-vnodes]").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.vnodes) === vnodeCount);
  });
}

document.querySelectorAll("[data-vnodes]").forEach((button) => {
  button.addEventListener("click", () => renderBalance(Number(button.dataset.vnodes)));
});

// Chapter 6: short knowledge check.
const quiz = [
  {
    question: "A key lands at position 80. Servers sit at 30, 100, and 190. Who owns it?",
    options: ["Server at 30", "Server at 100", "Server at 190"],
    answer: 1,
    explanation: "Walk clockwise from 80. The first server you meet is at 100.",
  },
  {
    question: "What is the main benefit when one server joins the ring?",
    options: [
      "Every key gets a new hash",
      "Only a neighboring range of keys moves",
      "No data ever needs to move",
    ],
    answer: 1,
    explanation: "The new server takes only the arc between its predecessor and itself.",
  },
  {
    question: "Why give each physical server many virtual nodes?",
    options: [
      "To spread ownership more evenly",
      "To make hashes secret",
      "To avoid using replication",
    ],
    answer: 0,
    explanation: "Many positions smooth out random gaps and can represent different capacities.",
  },
];

let quizIndex = 0;
let quizScore = 0;
let selectedAnswer = null;
let answerChecked = false;

function renderQuiz() {
  const item = quiz[quizIndex];
  const area = document.getElementById("quizArea");
  area.innerHTML = `
    <span class="quiz-question-count">Question ${quizIndex + 1} of ${quiz.length}</span>
    <p class="quiz-question">${item.question}</p>
    <div class="quiz-options">
      ${item.options
        .map(
          (option, index) => `
            <button class="quiz-option" type="button" data-option="${index}">
              <i>${String.fromCharCode(65 + index)}</i><span>${option}</span>
            </button>`,
        )
        .join("")}
    </div>
    <p class="quiz-feedback">${answerChecked ? item.explanation : "Choose an answer, then check it."}</p>
  `;

  area.querySelectorAll(".quiz-option").forEach((button) => {
    const option = Number(button.dataset.option);
    button.classList.toggle("selected", selectedAnswer === option && !answerChecked);
    if (answerChecked) {
      button.classList.toggle("correct", option === item.answer);
      button.classList.toggle("wrong", option === selectedAnswer && option !== item.answer);
      button.disabled = true;
    } else {
      button.addEventListener("click", () => {
        selectedAnswer = option;
        renderQuiz();
      });
    }
  });

  document.getElementById("quizScore").textContent = `${quizScore} / ${quiz.length}`;
  document.getElementById("nextQuiz").textContent = answerChecked
    ? quizIndex === quiz.length - 1
      ? "See my result"
      : "Next question →"
    : "Check answer";
}

document.getElementById("nextQuiz").addEventListener("click", () => {
  if (!answerChecked) {
    if (selectedAnswer === null) {
      document.querySelector(".quiz-feedback").textContent = "Pick one option first.";
      return;
    }
    answerChecked = true;
    if (selectedAnswer === quiz[quizIndex].answer) quizScore += 1;
    renderQuiz();
    return;
  }

  if (quizIndex < quiz.length - 1) {
    quizIndex += 1;
    selectedAnswer = null;
    answerChecked = false;
    renderQuiz();
  } else {
    document.getElementById("quizScore").textContent = `${quizScore} / ${quiz.length}`;
    document.getElementById("completionCard").classList.add("visible");
  }
});

function resetQuiz() {
  quizIndex = 0;
  quizScore = 0;
  selectedAnswer = null;
  answerChecked = false;
  document.getElementById("completionCard").classList.remove("visible");
  renderQuiz();
}

document.getElementById("replayQuiz").addEventListener("click", resetQuiz);

// Initial render.
renderModulo();
renderRouteRing();
renderChangeRing();
renderBalance(1);
resetQuiz();
const savedStep = Number(localStorage.getItem("hash-ring-step"));
showStep(Number.isInteger(savedStep) && savedStep >= 0 && savedStep < TOTAL_STEPS ? savedStep : 0);
