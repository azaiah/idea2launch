// Order storage. On Netlify this uses Netlify Blobs (zero setup).
// Locally (or anywhere Blobs isn't available) it falls back to a JSON file
// in .data/ so `npm run dev` works without any Netlify login.

import { promises as fs } from "node:fs";
import path from "node:path";

let blobStore = null;
let triedBlobs = false;

async function getBlobStore() {
  if (triedBlobs) return blobStore;
  triedBlobs = true;
  if (process.env.I2L_LOCAL_STORE) return null;
  try {
    const { getStore } = await import("@netlify/blobs");
    blobStore = getStore({ name: "idea2launch-orders", consistency: "strong" });
    // touch it so a missing environment throws here rather than later
    await blobStore.get("__ping__");
  } catch {
    blobStore = null;
  }
  return blobStore;
}

const LOCAL_DIR = path.resolve(process.cwd(), ".data");
const localFile = (key) => path.join(LOCAL_DIR, encodeURIComponent(key) + ".json");

export async function getJSON(key) {
  const s = await getBlobStore();
  if (s) return (await s.get(key, { type: "json" })) ?? null;
  try {
    return JSON.parse(await fs.readFile(localFile(key), "utf8"));
  } catch {
    return null;
  }
}

export async function setJSON(key, value) {
  const s = await getBlobStore();
  if (s) return s.setJSON(key, value);
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(localFile(key), JSON.stringify(value, null, 2));
}

export async function listKeys(prefix) {
  const s = await getBlobStore();
  if (s) {
    const { blobs } = await s.list({ prefix });
    return blobs.map((b) => b.key);
  }
  try {
    const files = await fs.readdir(LOCAL_DIR);
    return files
      .map((f) => decodeURIComponent(f.replace(/\.json$/, "")))
      .filter((k) => k.startsWith(prefix));
  } catch {
    return [];
  }
}

// ---- order helpers -------------------------------------------------------

export const orderKey = (id) => `order:${id}`;
export const squareIndexKey = (squareOrderId) => `sq:${squareOrderId}`;

export async function getOrder(id) {
  return getJSON(orderKey(id));
}

export async function saveOrder(order) {
  order.updatedAt = new Date().toISOString();
  await setJSON(orderKey(order.id), order);
  return order;
}

export async function listOrders() {
  const keys = await listKeys("order:");
  const orders = await Promise.all(keys.map((k) => getJSON(k)));
  return orders
    .filter(Boolean)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export function newOrderId() {
  // Short, human-friendly, unambiguous: I2L-7K3QF9
  const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  let s = "";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) s += alphabet[b % alphabet.length];
  return `I2L-${s}`;
}
