const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const PKG = {
  blueprint: { name: "Idea Blueprint", price: 299, turn: "Delivered in 24–48 hours after scope is confirmed." },
  prototype: { name: "Idea2Launch Prototype", price: 799, turn: "Delivered in 3–5 business days after scope is confirmed." },
  plus: { name: "Idea2Launch Plus", price: 1499, turn: "Delivered in 5–7 business days after scope is confirmed." },
};
const RUSH = { price: 199, appliesTo: ["prototype", "plus"] };
const NEXT_LABELS = ["Next: the details", "Next: choose a package", "Next: your contact info"];

const form = $("#intake");
const steps = $$("fieldset[data-step]", form);
const progress = $$("#progress li");
const alertEl = $("#alert");
let step = 0;
let concept = null;

// ---- Prefill from homepage sketch + URL -----------------------------------
const params = new URLSearchParams(location.search);
try {
  const saved = JSON.parse(sessionStorage.getItem("i2l_idea") || "null");
  if (saved?.idea) {
    $("#ideaText").value = saved.idea;
    concept = saved.concept || null;
    if (concept?.name) $("#ideaName").placeholder = `e.g. ${concept.name}`;
    if (concept?.audience) $("#audience").placeholder = concept.audience;
    if (concept?.workingFunction) $("#mustHave").placeholder = concept.workingFunction;
    if (concept) {
      $("#concept-peek").hidden = false;
      $("#peek-text").textContent = `Suggested first feature: ${concept.workingFunction}. We'll refine this with you.`;
      const rec = document.getElementById(`rec-${concept.recommended}`);
      if (rec) rec.hidden = false;
    }
  }
} catch {}
const pkgParam = params.get("package") || concept?.recommended;
if (PKG[pkgParam]) {
  const r = form.querySelector(`input[name="package"][value="${pkgParam}"]`);
  if (r) r.checked = true;
}

// ---- Summary --------------------------------------------------------------
function currentPkg() {
  return form.querySelector('input[name="package"]:checked')?.value || "prototype";
}
function updateSummary() {
  const p = currentPkg();
  const rushOk = RUSH.appliesTo.includes(p);
  $("#rush-wrap").hidden = !rushOk;
  if (!rushOk) $("#rush").checked = false;
  const rush = $("#rush").checked;
  const lines = [[PKG[p].name, PKG[p].price]];
  if (rush) lines.push(["Priority build", RUSH.price]);
  $("#sum-lines").innerHTML = lines.map(([n, v]) => `<dt>${n}</dt><dd>$${v.toLocaleString()}</dd>`).join("");
  $("#sum-total").textContent = "$" + lines.reduce((s, l) => s + l[1], 0).toLocaleString();
  $("#sum-turn").textContent = rush ? PKG[p].turn.replace("Delivered", "Priority delivery, at the front of the queue,") : PKG[p].turn;
  $("#pay").textContent = p === "blueprint" ? "Continue to secure payment ($299)" : `Continue to secure payment ($${lines.reduce((s, l) => s + l[1], 0).toLocaleString()})`;
}
form.addEventListener("change", updateSummary);
updateSummary();

// ---- Validation -----------------------------------------------------------
function setError(el, msg) {
  el.setAttribute("aria-invalid", msg ? "true" : "false");
  let e = el.parentElement.querySelector(".field-error");
  if (msg) {
    if (!e) {
      e = document.createElement("div");
      e.className = "field-error";
      e.id = el.id + "-err";
      el.insertAdjacentElement("afterend", e);
      el.setAttribute("aria-describedby", ((el.getAttribute("aria-describedby") || "") + " " + e.id).trim());
    }
    e.textContent = msg;
  } else if (e) e.remove();
}
function validate(i) {
  const errs = [];
  if (i === 0) {
    const t = $("#ideaText");
    const ok = t.value.trim().length >= 20;
    setError(t, ok ? "" : "Give us at least a sentence or two. What does it do, and for whom?");
    if (!ok) errs.push(t);
  }
  if (i === 1) {
    const m = $("#mustHave");
    const ok = m.value.trim().length >= 5;
    setError(m, ok ? "" : "Tell us the one thing it has to do. A few words is fine.");
    if (!ok) errs.push(m);
  }
  if (i === 3) {
    const n = $("#name"), e = $("#email"), a = $("#agree");
    if (!n.value.trim()) { setError(n, "Add your name."); errs.push(n); } else setError(n, "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.value.trim())) { setError(e, "Add an email we can reach you at."); errs.push(e); } else setError(e, "");
    if (!a.checked) { errs.push(a); showAlert("Check the box to confirm you've read what your package includes."); }
  }
  if (errs.length) errs[0].focus();
  return errs.length === 0;
}
function showAlert(msg) {
  alertEl.textContent = msg;
  alertEl.hidden = !msg;
}

// ---- Stepper --------------------------------------------------------------
function go(n, scroll = true) {
  showAlert("");
  step = n;
  steps.forEach((s, i) => (s.hidden = i !== n));
  progress.forEach((li, i) => {
    li.classList.toggle("active", i === n);
    li.classList.toggle("done", i < n);
    if (i === n) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
  });
  $("#back").hidden = n === 0;
  $("#next").hidden = n === steps.length - 1;
  $("#pay").hidden = n !== steps.length - 1;
  if (n < NEXT_LABELS.length) $("#next").textContent = NEXT_LABELS[n];
  const first = steps[n].querySelector("input:not([type=hidden]):not([tabindex='-1']), textarea, select");
  if (first && n > 0) first.focus({ preventScroll: true });
  if (scroll) form.scrollIntoView({ behavior: "smooth", block: "start" });
  track("intake_step", { step: n });
}
$("#next").addEventListener("click", () => validate(step) && go(step + 1));
$("#back").addEventListener("click", () => go(step - 1));
form.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.tagName === "INPUT" && step < steps.length - 1) {
    e.preventDefault();
    $("#next").click();
  }
});

// ---- Submit ---------------------------------------------------------------
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validate(3)) return;
  const btn = $("#pay");
  btn.disabled = true;
  btn.textContent = "Saving your idea…";

  const fd = new FormData(form);
  const payload = {
    ideaName: fd.get("ideaName"),
    idea: fd.get("idea"),
    audience: fd.get("audience"),
    mustHave: fd.get("mustHave"),
    outcome: fd.get("outcome"),
    inspiration: fd.get("inspiration"),
    timeline: fd.get("timeline"),
    package: currentPkg(),
    addons: fd.getAll("addons"),
    name: fd.get("name"),
    email: fd.get("email"),
    phone: fd.get("phone"),
    source: fd.get("source"),
    agreedToScope: $("#agree").checked,
    company_website: fd.get("company_website"),
    concept,
  };
  try { payload.utm = JSON.parse(sessionStorage.getItem("i2l_utm") || "{}"); } catch {}

  try {
    const res = await fetch("/api/submit-idea", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "We couldn't save your idea. Check your connection and try again.");

    // Email notification backup via Netlify Forms (doesn't block checkout)
    const nf = new URLSearchParams({ "form-name": "idea-intake", ref: data.id });
    for (const k of ["package", "name", "email", "phone", "ideaName", "idea", "audience", "outcome", "mustHave", "inspiration", "timeline", "source"])
      nf.append(k, payload[k] || "");
    nf.append("addons", (payload.addons || []).join(","));
    const notify = fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: nf.toString() }).catch(() => {});

    track("intake_submit", { package: payload.package, mode: data.mode });
    try { sessionStorage.removeItem("i2l_idea"); } catch {}
    await Promise.race([notify, new Promise((r) => setTimeout(r, 1200))]);

    if (data.checkoutUrl) {
      btn.textContent = "Opening secure checkout…";
      location.href = data.checkoutUrl;
    } else {
      location.href = `/success/?ref=${encodeURIComponent(data.id)}&mode=invoice`;
    }
  } catch (err) {
    showAlert(err.message);
    btn.disabled = false;
    updateSummary();
  }
});

function track(name, props) {
  try { (window.dataLayer = window.dataLayer || []).push({ event: name, ...props }); } catch {}
}

go(0, false);
