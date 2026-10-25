// /api/admin  — protected by ADMIN_PASSWORD (sent as Bearer token)
// GET            → all orders + summary
// PATCH {id, status?, note?, deliveryUrl?}  → update one order
// POST  {action:"checkout-link", id}        → (re)create a Square checkout link for an order

import { listOrders, getOrder, saveOrder, setJSON, squareIndexKey } from "../lib/store.mjs";
import { STATUSES, PACKAGES, priceFor } from "../lib/packages.mjs";
import { json, bad, readJSON, clean, requireAdmin, siteUrl } from "../lib/http.mjs";
import { squareConfigured, createPaymentLink } from "../lib/square.mjs";

const PAID = ["paid", "scoping", "building", "review", "delivered"];

export default async (req) => {
  const authError = requireAdmin(req);
  if (authError) return bad(authError, 401);

  if (req.method === "GET") {
    const orders = await listOrders();
    const paid = orders.filter((o) => PAID.includes(o.status));
    return json({
      orders,
      statuses: STATUSES,
      packages: PACKAGES,
      squareConfigured: squareConfigured(),
      summary: {
        leads: orders.length,
        paid: paid.length,
        revenue: paid.reduce((s, o) => s + (o.amountPaid ?? o.total ?? 0), 0),
        inProgress: orders.filter((o) => ["scoping", "building", "review"].includes(o.status)).length,
        awaitingPayment: orders.filter((o) => ["new", "checkout"].includes(o.status)).length,
      },
    });
  }

  const b = await readJSON(req);
  if (!b?.id) return bad("Missing order id.");
  const order = await getOrder(b.id);
  if (!order) return bad("Order not found.", 404);
  order.notes = order.notes || [];

  if (req.method === "PATCH") {
    if (b.status) {
      if (!STATUSES.includes(b.status)) return bad("Unknown status.");
      if (b.status !== order.status) {
        order.notes.push({ at: new Date().toISOString(), text: `Status: ${order.status} → ${b.status}` });
        if (b.status === "paid" && !order.paidAt) {
          order.paidAt = new Date().toISOString();
          order.amountPaid = order.total;
        }
        order.status = b.status;
      }
    }
    if (b.note) order.notes.push({ at: new Date().toISOString(), text: clean(b.note, 2000) });
    if (typeof b.deliveryUrl === "string") order.deliveryUrl = clean(b.deliveryUrl, 500);
    await saveOrder(order);
    return json({ order });
  }

  if (req.method === "POST" && b.action === "checkout-link") {
    if (!squareConfigured()) return bad("Square API keys aren't set yet.");
    const pkg = b.package && PACKAGES[b.package] ? b.package : order.package;
    const pricing = priceFor(pkg, order.addons || []);
    // Allow a custom quote amount (in dollars) for bigger scopes.
    const lines = b.customAmount
      ? [{ name: `Idea2Launch custom scope — ${order.ideaName || order.id}`, amount: Math.round(Number(b.customAmount) * 100) }]
      : pricing.lines;
    if (!lines[0].amount || lines[0].amount < 100) return bad("Amount looks wrong.");
    const link = await createPaymentLink({
      order: { ...order, id: `${order.id}`, package: pkg },
      lines,
      redirectUrl: `${siteUrl(req)}/success/?ref=${encodeURIComponent(order.id)}`,
    });
    order.package = pkg;
    order.total = lines.reduce((s, l) => s + l.amount, 0);
    order.lines = lines;
    order.square = { linkId: link.linkId, orderId: link.squareOrderId, url: link.url };
    if (order.status === "new") order.status = "checkout";
    order.notes.push({ at: new Date().toISOString(), text: `New Square link: ${link.url}` });
    await saveOrder(order);
    await setJSON(squareIndexKey(link.squareOrderId), { id: order.id });
    return json({ order, url: link.url });
  }

  return bad("Unsupported request.", 405);
};

export const config = { path: "/api/admin" };
