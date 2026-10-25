export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });

export const bad = (message, status = 400) => json({ error: message }, status);

export async function readJSON(req) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export const clean = (v, max = 2000) =>
  typeof v === "string" ? v.replace(/\u0000/g, "").trim().slice(0, max) : "";

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v || "");

export function siteUrl(req) {
  // Netlify sets URL (primary) and DEPLOY_PRIME_URL (branch/preview).
  const fromEnv = process.env.SITE_URL || process.env.URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  try {
    const u = new URL(req.url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "";
  }
}

export function requireAdmin(req) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return "ADMIN_PASSWORD is not set in Netlify environment variables.";
  const header = req.headers.get("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "");
  if (!token || !timingSafeEqual(token, pw)) return "Wrong password.";
  return null;
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
