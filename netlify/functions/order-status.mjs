// GET /api/order-status?ref=I2L-XXXXXX  → minimal public status for the success page
// GET /api/order-status?spots=1         → founding spots remaining (real paid count)

import { getOrder, listOrders } from "../lib/store.mjs";
import { FOUNDING, PACKAGES } from "../lib/packages.mjs";
import { json, bad } from "../lib/http.mjs";

const PAID = ["paid", "scoping", "building", "review", "delivered"];

export default async (req) => {
  const url = new URL(req.url);

  if (url.searchParams.get("spots")) {
    if (!FOUNDING.enabled) return json({ enabled: false });
    const orders = await listOrders();
    const taken = orders.filter((o) => PAID.includes(o.status)).length;
    return json(
      { enabled: true, total: FOUNDING.totalSpots, taken, left: Math.max(0, FOUNDING.totalSpots - taken) },
      200,
      { "cache-control": "public, max-age=60" }
    );
  }

  const ref = (url.searchParams.get("ref") || "").toUpperCase();
  if (!/^I2L-[A-Z0-9]{6}$/.test(ref)) return bad("Unknown reference.", 404);
  const o = await getOrder(ref);
  if (!o) return bad("Unknown reference.", 404);
  return json({
    id: o.id,
    firstName: (o.contact?.name || "").split(" ")[0],
    package: PACKAGES[o.package]?.name,
    turnaround: PACKAGES[o.package]?.turnaround,
    paid: PAID.includes(o.status),
    status: o.status,
  });
};

export const config = { path: "/api/order-status" };
