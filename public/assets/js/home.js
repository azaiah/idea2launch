import { buildConcept } from "./concept.js";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

const form = $("#idea-form");
const input = $("#idea");
const napkin = $("#napkin-text");
const browser = $("#browser");
const statusEl = $("#build-status");
const conceptEl = $("#concept");
const PRICES = { blueprint: "$299", prototype: "$799", plus: "$1,499" };
const NAMES = { blueprint: "Idea Blueprint", prototype: "Prototype", plus: "Plus" };

// ---- Tabs ----------------------------------------------------------------
const tabs = [$("#tab-site"), $("#tab-dash")];
function selectTab(i) {
  tabs.forEach((t, j) => {
    const on = i === j;
    t.setAttribute("aria-selected", on);
    t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
  });
}
tabs.forEach((t, i) => {
  t.addEventListener("click", () => selectTab(i));
  t.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      const n = (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      selectTab(n);
      tabs[n].focus();
    }
  });
});

// ---- Napkin mirrors typing ------------------------------------------------
function setNapkin(text) {
  napkin.innerHTML = esc(text || "Type your idea…") + '<span class="caret"></span>';
}
input.addEventListener("input", () => setNapkin(input.value));

// ---- Render a concept into the browser mock -------------------------------
function render(c, { animate = false, rowNew = false } = {}) {
  $("#url-name").textContent = c.name.toLowerCase().replace(/[^a-z0-9]/g, "") || "youridea";
  $("#p-name").textContent = c.name;
  $("#p-tagline").textContent = c.tagline;
  $("#p-aud").textContent = `Built for ${c.audience.replace(/^for\s+/i, "")}.`;
  const f = c.formFields || [];
  $("#p-form").innerHTML =
    f.map((x) => `<span class="mini-field">${esc(x)}</span>`).join("") + `<span class="mini-btn">${esc(c.cta)}</span>`;
  $("#p-features").innerHTML = (c.features || []).slice(0, 3).map((x) => `<span>${esc(x)}</span>`).join("");
  $("#d-title").textContent = `${c.name} dashboard`;
  $("#d-cols").innerHTML = (c.columns || []).map((x) => `<th>${esc(x)}</th>`).join("");
  const rows = (c.sample || []).map((r) => `<tr>${r.map((v, i) => `<td>${i === r.length - 1 ? `<span class="pill">${esc(v)}</span>` : esc(v)}</td>`).join("")}</tr>`);
  if (rowNew) {
    const base = (c.sample && c.sample[0]) || [];
    const cols = c.columns?.length || 4;
    const cells = ["You, just now", ...base.slice(1, cols - 1)];
    while (cells.length < cols - 1) cells.push("—");
    rows.unshift(`<tr class="new-row">${cells.map((v) => `<td>${esc(v)}</td>`).join("")}<td><span class="pill new">New</span></td></tr>`);
  }
  $("#d-rows").innerHTML = rows.join("");
  $("#k1").textContent = 8 + (c.name.length % 9);
  $("#k2").textContent = rowNew ? 1 + (c.name.length % 4) : 2;

  if (animate && !reduced) {
    browser.classList.remove("built");
    browser.classList.add("building");
    void browser.offsetWidth;
    browser.classList.remove("building");
    browser.classList.add("built");
  }
}

function renderConcept(c) {
  $("#c-title").textContent = `What we'd build first for ${c.name}`;
  $("#c-fn").textContent = c.workingFunction;
  $("#c-aud").textContent = c.audience.charAt(0).toUpperCase() + c.audience.slice(1);
  $("#c-features").innerHTML = c.features.map((x) => `<li>${esc(x)}</li>`).join("");
  $("#c-roadmap").innerHTML = c.roadmap.map((x) => `<li>${esc(x)}</li>`).join("");
  const rec = c.recommended || "prototype";
  $("#c-rec").innerHTML =
    rec === "plus"
      ? `This idea has a few moving parts, so <strong>Plus (${PRICES.plus})</strong> fits best. The Prototype works if you want to start with one feature.`
      : rec === "blueprint"
      ? `Start with a <strong>Blueprint (${PRICES.blueprint})</strong> to shape it, then build.`
      : `The <strong>Prototype (${PRICES.prototype})</strong> covers this: a live site, your dashboard and the feature above working.`;
  const cta = $("#c-cta");
  cta.textContent = `Build ${c.name} for real, ${PRICES[rec]}`;
  cta.href = `/start/?package=${rec}`;
  conceptEl.hidden = false;
}

// ---- Save for the intake form --------------------------------------------
function remember(idea, concept) {
  try {
    sessionStorage.setItem("i2l_idea", JSON.stringify({ idea, concept, at: Date.now() }));
  } catch {}
}

// ---- Run the build -------------------------------------------------------
let runId = 0;
async function run(idea) {
  const id = ++runId;
  const instant = buildConcept(idea);
  setNapkin(idea);
  selectTab(0);
  statusEl.innerHTML = '<span class="spin" aria-hidden="true"></span> Sketching your website…';
  render(instant, { animate: true });
  renderConcept(instant);
  remember(idea, instant);

  // switch to dashboard to show a record "arriving"
  setTimeout(() => {
    if (id !== runId) return;
    statusEl.innerHTML = '<span class="spin" aria-hidden="true"></span> Someone just used your form. Here\'s your dashboard…';
    render(instant, { rowNew: true });
    selectTab(1);
  }, reduced ? 200 : 1700);

  let final = instant;
  try {
    const res = await fetch("/api/idea-spark", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idea }),
    });
    if (res.ok) {
      const c = await res.json();
      if (id === runId && c && c.name) final = c;
    }
  } catch {}

  setTimeout(() => {
    if (id !== runId) return;
    render(final, { rowNew: true });
    renderConcept(final);
    remember(idea, final);
    statusEl.textContent = "That's a sketch. Your real prototype gets designed, built and tested by a developer.";
  }, reduced ? 300 : 2600);

  track("idea_preview", { pattern: final.pattern || "ai" });
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const idea = input.value.trim();
  if (idea.length < 8) {
    input.focus();
    statusEl.textContent = "Add a sentence about your idea first, like who it's for and what it does.";
    return;
  }
  run(idea);
  if (innerWidth < 960) $("#builder").scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
});

document.querySelectorAll(".chip").forEach((chip) =>
  chip.addEventListener("click", () => {
    input.value = chip.dataset.idea;
    run(chip.dataset.idea);
    if (innerWidth < 960) $("#builder").scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  })
);

// Initial demo state (static, no animation)
render(buildConcept("A booking site for my mobile car detailing business"));

// ---- Founding spots (real paid count from the server) ---------------------
(async () => {
  const box = $("#spots");
  try {
    const r = await fetch("/api/order-status?spots=1");
    if (!r.ok) throw 0;
    const s = await r.json();
    if (!s.enabled) return;
    if (s.taken > 0) {
      $("#spots-bar").innerHTML = Array.from({ length: s.total }, (_, i) => `<i class="${i < s.taken ? "taken" : ""}"></i>`).join("");
      $("#spots-text").textContent =
        s.left > 0 ? `Introductory pricing: ${s.left} of ${s.total} founding spots left` : "Founding spots are full. Current pricing below.";
    } else {
      $("#spots-bar").innerHTML = "";
      $("#spots-text").textContent = `Introductory pricing for our first ${s.total} customers`;
    }
    box.hidden = false;
  } catch {
    $("#spots-bar").innerHTML = "";
    box.hidden = false;
  }
})();

// ---- Mobile sticky CTA after the hero -------------------------------------
const mcta = $("#mobile-cta");
if (mcta && "IntersectionObserver" in window) {
  const io = new IntersectionObserver(([e]) => mcta.classList.toggle("show", !e.isIntersecting), { threshold: 0 });
  io.observe(document.querySelector(".hero"));
}

// ---- UTM capture for attribution -----------------------------------------
try {
  const p = new URLSearchParams(location.search);
  const utm = {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "ref"].forEach((k) => p.get(k) && (utm[k] = p.get(k)));
  if (Object.keys(utm).length) sessionStorage.setItem("i2l_utm", JSON.stringify(utm));
} catch {}

function track(name, props) {
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: name, ...props });
  } catch {}
}

const yr = document.getElementById("yr");
if (yr) yr.textContent = new Date().getFullYear();
