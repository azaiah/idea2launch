// POST /api/submit-idea
// Saves the intake, then (if Square is set up) creates a checkout link for it.
// Response: { id, checkoutUrl?, mode: "square" | "static" | "manual" }

import { PACKAGES, ADDONS, priceFor } from "../lib/packages.mjs";
import { newOrderId, saveOrder, setJSON, squareIndexKey } from "../lib/store.mjs";
import { json, bad, readJSON, clean, isEmail, siteUrl } from "../lib/http.mjs";
import { squareConfigured, createPaymentLink, staticLinkFor } from "../lib/square.mjs";

export default async (req) => {
  if (req.method !== "POST") return bad("Use POST.", 405);
  const b = await readJSON(req);
  if (!b) return bad("Send the form as JSON.");

  // Honeypot: real people never fill this hidden field.
  if (clean(b.company_website)) return json({ id: "ok", mode: "manual" });

  const pkg = PACKAGES[b.package] ? b.package : null;
  const order = {
    id: newOrderId(),
    createdAt: new Date().toISOString(),
    status: "new",
    package: pkg,
    addons: (Array.isArray(b.addons) ? b.addons : []).filter((a) => ADDONS[a]?.enabled),
    ideaName: clean(b.ideaName, 80),
    idea: clean(b.idea, 3000),
    audience: clean(b.audience, 600),
    outcome: clean(b.outcome, 600),
    mustHave: clean(b.mustHave, 600),
    inspiration: clean(b.inspiration, 600),
    timeline: clean(b.timeline, 60),
    source: clean(b.source, 80),
    concept: typeof b.concept === "object" && b.concept && JSON.stringify(b.concept).length < 8000 ? b.concept : null,
    contact: {
      name: clean(b.name, 120),
      email: clean(b.email, 200).toLowerCase(),
      phone: clean(b.phone, 40),
    },
    agreedToScope: Boolean(b.agreedToScope),
    notes: [],
    utm: typeof b.utm === "object" && b.utm ? Object.fromEntries(Object.entries(b.utm).slice(0, 6).map(([k, v]) => [clean(k, 30), clean(String(v), 120)])) : {},
  };

  const problems = [];
  if (!pkg) problems.push("Choose a package.");
  if (order.idea.length < 20) problems.push("Describe your idea in at least a sentence or two.");
  if (!order.contact.name) problems.push("Add your name.");
  if (!isEmail(order.contact.email)) problems.push("Add an email address we can reach you at.");
  if (!order.agreedToScope) problems.push("Confirm you've read what's included in your package.");
  if (problems.length) return json({ error: problems.join(" "), problems }, 422);

  const pricing = priceFor(pkg, order.addons);
  order.total = pricing.total;
  order.lines = pricing.lines;
  await saveOrder(order);

  const site = siteUrl(req);
  const redirectUrl = `${site}/success/?ref=${encodeURIComponent(order.id)}`;

  // 1) Square API — itemized checkout tied to this order (best: auto-marks paid via webhook)
  if (squareConfigured()) {
    try {
      const link = await createPaymentLink({ order, lines: pricing.lines, redirectUrl });
      order.status = "checkout";
      order.square = { linkId: link.linkId, orderId: link.squareOrderId, url: link.url };
      await saveOrder(order);
      await setJSON(squareIndexKey(link.squareOrderId), { id: order.id });
      return json({ id: order.id, checkoutUrl: link.url, mode: "square" });
    } catch (e) {
      order.notes.push({ at: new Date().toISOString(), text: `Square link failed: ${e.message}` });
      await saveOrder(order);
      // fall through to static/manual
    }
  }

  // 2) Static Square links pasted into env vars (works day one, mark paid by hand in /admin)
  const staticUrl = order.addons.length ? null : staticLinkFor(pkg);
  if (staticUrl) {
    order.status = "checkout";
    await saveOrder(order);
    return json({ id: order.id, checkoutUrl: staticUrl, mode: "static" });
  }

  // 3) Manual — we email a Square invoice
  return json({ id: order.id, mode: "manual" });
};

export const config = { path: "/api/submit-idea" };
