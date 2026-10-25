// POST /api/square-webhook
// Subscribe to `payment.updated` (and optionally `payment.created`) in the Square Developer Dashboard,
// pointing at https://YOUR-SITE/api/square-webhook. Paste the signature key into
// SQUARE_WEBHOOK_SIGNATURE_KEY.

import { verifyWebhook } from "../lib/square.mjs";
import { getJSON, getOrder, saveOrder, squareIndexKey } from "../lib/store.mjs";
import { json, siteUrl } from "../lib/http.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ ok: true });
  const rawBody = await req.text();
  const signature = req.headers.get("x-square-hmacsha256-signature");
  const notificationUrl = process.env.SQUARE_WEBHOOK_URL || `${siteUrl(req)}/api/square-webhook`;

  if (!verifyWebhook({ rawBody, signature, notificationUrl })) {
    return json({ error: "Invalid signature" }, 401);
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: "Bad JSON" }, 400);
  }

  const payment = event?.data?.object?.payment;
  if (!payment?.order_id) return json({ ok: true, ignored: true });

  const idx = await getJSON(squareIndexKey(payment.order_id));
  if (!idx?.id) return json({ ok: true, unknownOrder: true });
  const order = await getOrder(idx.id);
  if (!order) return json({ ok: true, missing: true });

  order.square = { ...(order.square || {}), paymentId: payment.id, paymentStatus: payment.status };
  if (payment.status === "COMPLETED" && !["paid", "scoping", "building", "review", "delivered"].includes(order.status)) {
    order.status = "paid";
    order.paidAt = new Date().toISOString();
    order.amountPaid = payment.amount_money?.amount ?? order.total;
    order.notes = order.notes || [];
    order.notes.push({ at: order.paidAt, text: `Square payment ${payment.id} completed.` });
  }
  await saveOrder(order);
  return json({ ok: true });
};

export const config = { path: "/api/square-webhook" };
