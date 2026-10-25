const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const money = (c) => "$" + ((c || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const when = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");

let token = "";
try { token = sessionStorage.getItem("i2l_admin") || ""; } catch {}
let data = null;
let selected = null;

async function api(method, body) {
  const res = await fetch("/api/admin", {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(j.error || `Request failed (${res.status})`), { status: res.status });
  return j;
}

async function load() {
  try {
    data = await api("GET");
  } catch (e) {
    if (e.status === 401) return showLogin(e.message);
    alertBox(e.message);
    return;
  }
  $("#login").hidden = true;
  $("#app").hidden = false;
  $("#logout").hidden = false;
  $("#sq-banner").hidden = data.squareConfigured;
  const s = data.summary;
  $("#s-leads").textContent = s.leads;
  $("#s-await").textContent = s.awaitingPayment;
  $("#s-paid").textContent = s.paid;
  $("#s-prog").textContent = s.inProgress;
  $("#s-rev").textContent = money(s.revenue);
  const fs = $("#f-status");
  if (fs.options.length === 1) data.statuses.forEach((x) => fs.add(new Option(x, x)));
  renderList();
  if (selected) renderDetail(data.orders.find((o) => o.id === selected));
}

function filtered() {
  const q = $("#q").value.trim().toLowerCase();
  const st = $("#f-status").value;
  return data.orders.filter((o) => {
    if (st && o.status !== st) return false;
    if (!q) return true;
    return [o.id, o.contact?.name, o.contact?.email, o.idea, o.ideaName].join(" ").toLowerCase().includes(q);
  });
}

function renderList() {
  const rows = filtered();
  $("#list").innerHTML = rows.length
    ? rows
        .map(
          (o) => `<button class="row" data-id="${esc(o.id)}" aria-current="${o.id === selected}">
        <strong>${esc(o.ideaName || o.idea.slice(0, 60))}</strong><span class="st st-${esc(o.status)}">${esc(o.status)}</span>
        <span class="meta">${esc(o.contact?.name)} · ${esc(data.packages[o.package]?.name || o.package)} · ${money(o.total)} · ${when(o.createdAt)}</span>
      </button>`
        )
        .join("")
    : `<div class="empty">No ideas yet. Share your launch post and they'll show up here.</div>`;
  $("#list").querySelectorAll(".row").forEach((b) =>
    b.addEventListener("click", () => {
      selected = b.dataset.id;
      renderList();
      renderDetail(data.orders.find((o) => o.id === selected));
    })
  );
}

function renderDetail(o) {
  if (!o) return;
  const c = o.concept;
  $("#detail-wrap").innerHTML = `<div class="detail">
    <h2>${esc(o.ideaName || (o.idea.length > 70 ? o.idea.slice(0, 67) + "…" : o.idea))}</h2>
    <p class="muted small" style="margin:0">${esc(o.id)} · submitted ${when(o.createdAt)}${o.paidAt ? ` · paid ${when(o.paidAt)}` : ""}</p>
    <dl>
      <dt>Customer</dt><dd>${esc(o.contact?.name)}<br><a href="mailto:${esc(o.contact?.email)}?subject=${encodeURIComponent("Your Idea2Launch build " + o.id)}">${esc(o.contact?.email)}</a>${o.contact?.phone ? `<br><a href="tel:${esc(o.contact.phone)}">${esc(o.contact.phone)}</a>` : ""}</dd>
      <dt>Package</dt><dd>${esc(data.packages[o.package]?.name || o.package)} — ${money(o.total)}${(o.addons || []).length ? ` (incl. ${esc(o.addons.join(", "))})` : ""}</dd>
      <dt>Idea</dt><dd>${esc(o.idea)}</dd>
      <dt>Audience</dt><dd>${esc(o.audience || "—")}</dd>
      <dt>Must do</dt><dd>${esc(o.mustHave || "—")}</dd>
      <dt>Goal</dt><dd>${esc(o.outcome || "—")}</dd>
      <dt>Inspiration</dt><dd>${esc(o.inspiration || "—")}</dd>
      <dt>Timeline</dt><dd>${esc(o.timeline || "—")}</dd>
      <dt>Source</dt><dd>${esc(o.source || "—")}${o.utm && Object.keys(o.utm).length ? `<br><span class="muted small">${esc(Object.entries(o.utm).map(([k, v]) => k + "=" + v).join(" "))}</span>` : ""}</dd>
      ${c ? `<dt>Sketch concept</dt><dd>${esc(c.name)}: ${esc(c.workingFunction)}<br><span class="muted small">${esc((c.features || []).join(" · "))}</span></dd>` : ""}
      ${o.square?.url ? `<dt>Square link</dt><dd><a href="${esc(o.square.url)}" target="_blank" rel="noopener">${esc(o.square.url)}</a></dd>` : ""}
      ${o.deliveryUrl ? `<dt>Delivery</dt><dd><a href="${esc(o.deliveryUrl)}" target="_blank" rel="noopener">${esc(o.deliveryUrl)}</a></dd>` : ""}
    </dl>
    <div class="two">
      <div class="field" style="margin-bottom:.5rem"><label for="d-status">Status</label><select id="d-status">${data.statuses.map((s) => `<option ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}</select></div>
      <div class="field" style="margin-bottom:.5rem"><label for="d-url">Demo link</label><input id="d-url" type="url" value="${esc(o.deliveryUrl || "")}" placeholder="https://…netlify.app"></div>
    </div>
    <div class="field" style="margin-bottom:.5rem"><label for="d-note">Add a note</label><textarea id="d-note" rows="2" placeholder="Scope confirmed, call notes, build hours…"></textarea></div>
    <div class="actions">
      <button class="btn" id="d-save">Save changes</button>
      ${data.squareConfigured ? `<button class="btn btn-ghost" id="d-link">New Square payment link</button>` : ""}
      <button class="btn btn-ghost" id="d-prompt">Copy build brief</button>
    </div>
    <ul class="notes">${(o.notes || []).slice().reverse().map((n) => `<li><time>${when(n.at)}</time>${esc(n.text)}</li>`).join("") || "<li class='muted'>No notes yet.</li>"}</ul>
  </div>`;

  $("#d-save").addEventListener("click", async (e) => {
    e.target.disabled = true;
    try {
      await api("PATCH", { id: o.id, status: $("#d-status").value, note: $("#d-note").value.trim() || undefined, deliveryUrl: $("#d-url").value.trim() });
      await load();
    } catch (err) { alertBox(err.message); }
    e.target.disabled = false;
  });
  $("#d-link")?.addEventListener("click", async () => {
    const amt = prompt("Custom amount in dollars for a bigger scope? Leave blank to use the package price.", "");
    if (amt === null) return;
    try {
      const r = await api("POST", { action: "checkout-link", id: o.id, customAmount: amt ? Number(amt) : undefined });
      await navigator.clipboard?.writeText(r.url).catch(() => {});
      alertBox("New payment link copied: " + r.url);
      await load();
    } catch (err) { alertBox(err.message); }
  });
  $("#d-prompt").addEventListener("click", async () => {
    const brief = buildBrief(o);
    try { await navigator.clipboard.writeText(brief); alertBox("Build brief copied. Paste it into Claude Code or Cursor to start the build."); }
    catch { prompt("Copy the build brief:", brief); }
  });
}

// A ready-to-paste brief for Claude Code / Cursor so delivery starts in minutes.
function buildBrief(o) {
  const pkg = data.packages[o.package];
  const c = o.concept || {};
  return `Build an Idea2Launch ${pkg?.name || o.package} for DataIsData client ${o.contact?.name} (${o.id}).

SCOPE (${pkg?.summary || ""})
- Static site + Netlify Functions + Netlify Blobs, deployable to Netlify in one push.
- Public website: mobile-first landing page that explains the idea and drives to the working feature.
- Working feature${o.package === "plus" ? "s (up to 3)" : " (exactly 1)"}: ${o.mustHave || c.workingFunction || "lead capture"}.
- Admin dashboard at /admin (password via env var): list submissions, update status, add notes, export CSV.
- Use sample data where needed. No payments, no complex integrations, no sensitive data.
- Include a short ROADMAP.md of next-phase features.

THE IDEA
Name: ${o.ideaName || c.name || "TBD"}
Idea: ${o.idea}
Audience: ${o.audience || c.audience || ""}
Goal for the prototype: ${o.outcome || ""}
Look & feel inspiration: ${o.inspiration || "none given, choose a distinctive direction that fits the audience"}
Suggested features: ${(c.features || []).join("; ")}
Roadmap ideas: ${(c.roadmap || []).join("; ")}

Deliver: repo ready for GitHub, README with deploy steps, and a 5-bullet walkthrough script for the client demo.`;
}

function alertBox(msg) {
  let b = document.getElementById("toast");
  if (!b) {
    b = document.createElement("div");
    b.id = "toast";
    b.setAttribute("role", "status");
    b.style.cssText = "position:fixed;left:50%;bottom:1.25rem;transform:translateX(-50%);background:#14213d;color:#fff;padding:.8rem 1.1rem;border-radius:10px;max-width:90vw;z-index:99;font-size:.95rem;word-break:break-all";
    document.body.appendChild(b);
  }
  b.textContent = msg;
  b.hidden = false;
  clearTimeout(b._t);
  b._t = setTimeout(() => (b.hidden = true), 6000);
}

function showLogin(msg) {
  $("#app").hidden = true;
  $("#login").hidden = false;
  $("#logout").hidden = true;
  const e = $("#login-err");
  e.textContent = msg || "";
  e.hidden = !msg;
}

$("#login").addEventListener("submit", (e) => {
  e.preventDefault();
  token = $("#pw").value;
  try { sessionStorage.setItem("i2l_admin", token); } catch {}
  load();
});
$("#logout").addEventListener("click", () => {
  token = "";
  try { sessionStorage.removeItem("i2l_admin"); } catch {}
  showLogin();
});
$("#q").addEventListener("input", renderList);
$("#f-status").addEventListener("change", renderList);
$("#refresh").addEventListener("click", load);
$("#csv").addEventListener("click", () => {
  const cols = ["id", "createdAt", "status", "package", "total", "name", "email", "phone", "ideaName", "idea", "audience", "mustHave", "outcome", "source", "paidAt", "deliveryUrl"];
  const rows = data.orders.map((o) => [o.id, o.createdAt, o.status, o.package, (o.total || 0) / 100, o.contact?.name, o.contact?.email, o.contact?.phone, o.ideaName, o.idea, o.audience, o.mustHave, o.outcome, o.source, o.paidAt, o.deliveryUrl]);
  const csv = [cols, ...rows].map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `idea2launch-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
});

if (token) load(); else showLogin();
