// Local preview without the Netlify CLI:  npm run dev  →  http://localhost:8888
// Serves /public and routes /api/* to the functions. Orders are saved to .data/.
// (You can also use `netlify dev` if you have the Netlify CLI installed.)

import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.I2L_LOCAL_STORE = "1";
// Load .env if present (simple KEY=VALUE parser)
try {
  const env = await fs.readFile(".env", "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const PORT = Number(process.env.PORT || 8888);
const ROOT = path.resolve("public");
const ROUTES = {
  "/api/idea-spark": "idea-spark.mjs",
  "/api/submit-idea": "submit-idea.mjs",
  "/api/square-webhook": "square-webhook.mjs",
  "/api/order-status": "order-status.mjs",
  "/api/admin": "admin.mjs",
};
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp",
  ".svg": "image/svg+xml", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml", ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const fnFile = ROUTES[url.pathname];
  if (fnFile) {
    const mod = await import(pathToFileURL(path.resolve("netlify/functions", fnFile)).href);
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const request = new Request(url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : body });
    const response = await mod.default(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
    return;
  }
  if (url.pathname === "/idea" || url.pathname === "/go") {
    res.writeHead(302, { location: "/start/" });
    return res.end();
  }
  let p = path.join(ROOT, decodeURIComponent(url.pathname));
  if (!p.startsWith(ROOT)) return res.writeHead(403).end();
  try {
    const st = await fs.stat(p);
    if (st.isDirectory()) p = path.join(p, "index.html");
  } catch {
    if (!path.extname(p)) p = p + ".html";
  }
  try {
    const data = await fs.readFile(p);
    res.writeHead(200, { "content-type": TYPES[path.extname(p)] || "application/octet-stream" });
    res.end(data);
  } catch {
    const nf = await fs.readFile(path.join(ROOT, "404.html")).catch(() => "Not found");
    res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
    res.end(nf);
  }
});
server.listen(PORT, () => console.log(`Idea2Launch running at http://localhost:${PORT}`));
