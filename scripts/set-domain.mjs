// Swap the placeholder domain everywhere (canonical URLs, sitemap, schema, llms.txt, OG tags).
// Usage:  npm run set-domain -- https://idea2launch.dataisdata.com
import { promises as fs } from "node:fs";
import path from "node:path";

const OLD = "https://idea2launch-did.netlify.app";
const NEW = (process.argv[2] || "").replace(/\/$/, "");
if (!/^https:\/\/[a-z0-9.-]+$/i.test(NEW)) {
  console.error("Give the full new URL, e.g.  npm run set-domain -- https://idea2launch.dataisdata.com");
  process.exit(1);
}

async function walk(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (/\.(html|xml|txt|json|webmanifest)$/.test(e.name)) out.push(p);
  }
  return out;
}

let changed = 0;
for (const f of await walk("public")) {
  const s = await fs.readFile(f, "utf8");
  if (s.includes(OLD)) {
    await fs.writeFile(f, s.split(OLD).join(NEW));
    changed++;
  }
}
// Remember the new domain so the script works again next time.
const self = await fs.readFile("scripts/set-domain.mjs", "utf8");
await fs.writeFile("scripts/set-domain.mjs", self.replace(`const OLD = "${OLD}"`, `const OLD = "${NEW}"`));
console.log(`Updated ${changed} files: ${OLD} → ${NEW}`);
