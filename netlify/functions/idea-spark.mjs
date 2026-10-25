// POST /api/idea-spark  { idea }
// Returns a concept outline. Uses Claude when ANTHROPIC_API_KEY is set,
// otherwise the instant rules-based concept (always works, costs nothing).

import { buildConcept } from "../../public/assets/js/concept.js";
import { json, bad, readJSON, clean } from "../lib/http.mjs";

const SYSTEM = `You are the solutions architect at DataIsData, a web development agency.
A prospective customer typed a business idea. Draft a tight concept for a FIRST working prototype
(landing page + light admin dashboard + one working function). Be concrete, encouraging and realistic.
Respond with ONLY a JSON object, no prose, with exactly these keys:
{"name": string (short brandable product name, 1-2 words),
 "tagline": string (<= 12 words, plain language),
 "audience": string (who it serves, <= 14 words),
 "workingFunction": string (the ONE feature we'd make work in the prototype, <= 6 words),
 "cta": string (button text for that function, <= 4 words),
 "formFields": [3 short field labels],
 "columns": [4 short dashboard column labels],
 "sample": [[4 short sample values], [4 short sample values]],
 "features": [4 prototype features, each <= 8 words],
 "roadmap": [4 later-phase features, each <= 6 words],
 "recommended": "blueprint" | "prototype" | "plus"}`;

export default async (req) => {
  if (req.method !== "POST") return bad("Use POST.", 405);
  const body = await readJSON(req);
  const idea = clean(body?.idea, 600);
  if (idea.length < 8) return bad("Describe your idea in a sentence or two.");

  const fallback = buildConcept(idea);
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return json(fallback);

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
        max_tokens: 700,
        system: SYSTEM,
        messages: [{ role: "user", content: `Idea: ${idea}` }],
      }),
    });
    clearTimeout(t);
    if (!res.ok) throw new Error("AI " + res.status);
    const data = await res.json();
    const text = (data.content || []).map((c) => c.text || "").join("");
    const parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    // Merge so any missing key still has a sane value.
    const out = { ...fallback, ...sanitize(parsed), source: "ai" };
    return json(out);
  } catch (e) {
    return json({ ...fallback, note: "instant" });
  }
};

function sanitize(o) {
  const s = (v, n = 120) => (typeof v === "string" ? v.slice(0, n) : undefined);
  const arr = (v, n, len = 60) => (Array.isArray(v) ? v.slice(0, n).map((x) => String(x).slice(0, len)) : undefined);
  const out = {
    name: s(o.name, 32),
    tagline: s(o.tagline, 110),
    audience: s(o.audience, 140),
    workingFunction: s(o.workingFunction, 60),
    cta: s(o.cta, 28),
    formFields: arr(o.formFields, 3, 28),
    columns: arr(o.columns, 4, 20),
    sample: Array.isArray(o.sample) ? o.sample.slice(0, 2).map((r) => arr(r, 4, 24)) : undefined,
    features: arr(o.features, 4, 80),
    roadmap: arr(o.roadmap, 4, 60),
    recommended: ["blueprint", "prototype", "plus"].includes(o.recommended) ? o.recommended : undefined,
  };
  Object.keys(out).forEach((k) => out[k] === undefined && delete out[k]);
  return out;
}

export const config = { path: "/api/idea-spark" };
