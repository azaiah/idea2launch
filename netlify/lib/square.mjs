// Minimal Square client (no SDK needed).
// Docs: https://developer.squareup.com/reference/square/checkout-api/create-payment-link

import { createHmac, timingSafeEqual } from "node:crypto";

const SQUARE_VERSION = process.env.SQUARE_VERSION || "2026-09-16";

export function squareConfigured() {
  return Boolean(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID);
}

function baseUrl() {
  return (process.env.SQUARE_ENVIRONMENT || "production").toLowerCase() === "sandbox"
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";
}

async function call(pathname, body) {
  const res = await fetch(baseUrl() + pathname, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "Square-Version": SQUARE_VERSION,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.errors) {
    const msg = (data.errors || []).map((e) => `${e.code}: ${e.detail}`).join("; ") || `HTTP ${res.status}`;
    throw new Error(`Square error — ${msg}`);
  }
  return data;
}

/**
 * Create a hosted Square checkout page for one order.
 * Uses an itemized order (not quick_pay) so the add-on shows as its own line on the receipt.
 */
export async function createPaymentLink({ order, lines, redirectUrl }) {
  const body = {
    idempotency_key: `${order.id}-${order.package}-${lines.reduce((s, l) => s + l.amount, 0)}`.slice(0, 190),
    order: {
      location_id: process.env.SQUARE_LOCATION_ID,
      reference_id: order.id,
      line_items: lines.map((l) => ({
        name: l.name.slice(0, 500),
        quantity: "1",
        base_price_money: { amount: l.amount, currency: "USD" },
      })),
      metadata: { i2l_order_id: order.id, package: order.package },
    },
    checkout_options: {
      redirect_url: redirectUrl,
      ask_for_shipping_address: false,
      allow_tipping: false,
      ...(process.env.SUPPORT_EMAIL ? { merchant_support_email: process.env.SUPPORT_EMAIL } : {}),
    },
    pre_populated_data: {
      buyer_email: order.contact.email,
    },
    payment_note: `Idea2Launch ${order.id} — ${order.ideaName || "idea"}`.slice(0, 500),
  };
  const data = await call("/v2/online-checkout/payment-links", body);
  return {
    url: data.payment_link.url,
    linkId: data.payment_link.id,
    squareOrderId: data.payment_link.order_id,
  };
}

/**
 * Verify Square's webhook signature.
 * Square signs (notification URL + raw body) with HMAC-SHA256 using the subscription's signature key,
 * base64 encoded, in the `x-square-hmacsha256-signature` header.
 */
export function verifyWebhook({ rawBody, signature, notificationUrl }) {
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!key || !signature) return false;
  const expected = createHmac("sha256", key).update(notificationUrl + rawBody).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Static fallback: Square payment links made by hand in the Square Dashboard.
// Lets you take money on day one even before API keys are set up.
export function staticLinkFor(pkgId) {
  const map = {
    blueprint: process.env.SQUARE_LINK_BLUEPRINT,
    prototype: process.env.SQUARE_LINK_PROTOTYPE,
    plus: process.env.SQUARE_LINK_PLUS,
  };
  return map[pkgId] || null;
}
