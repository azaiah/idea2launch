// End-to-end check of the money path, with Square mocked:
// intake → Square checkout link → signed webhook → order marked paid → admin sees revenue.
// Run: npm test
import { createHmac } from "node:crypto";
import { rm } from "node:fs/promises";

process.env.I2L_LOCAL_STORE = "1";
process.env.ADMIN_PASSWORD = "test-pass";
process.env.SQUARE_ACCESS_TOKEN = "TEST";
process.env.SQUARE_LOCATION_ID = "LOC123";
process.env.SQUARE_ENVIRONMENT = "sandbox";
process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = "sigkey";
process.env.SITE_URL = "https://example.test";
delete process.env.ANTHROPIC_API_KEY;

await rm(".data", { recursive: true, force: true });

let squareBody = null;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  if (String(url).includes("squareupsandbox.com/v2/online-checkout/payment-links")) {
    squareBody = JSON.parse(opts.body);
    return new Response(JSON.stringify({ payment_link: { id: "PL1", url: "https://square.link/u/TEST", order_id: "SQORDER1" } }), { status: 200 });
  }
  return realFetch(url, opts);
};

const ok = (cond, msg) => { if (!cond) { console.error("FAIL:", msg); process.exit(1); } console.log("ok -", msg); };
const call = async (file, { method = "GET", body, headers = {}, path = "/" } = {}) => {
  const mod = await import(`../netlify/functions/${file}`);
  const req = new Request("https://example.test" + path, { method, headers, body: typeof body === "string" ? body : body ? JSON.stringify(body) : undefined });
  const res = await mod.default(req);
  return { status: res.status, json: await res.json() };
};

// 1. idea-spark falls back to the instant concept
const spark = await call("idea-spark.mjs", { method: "POST", body: { idea: "Bookings for my mobile dog grooming business" } });
ok(spark.status === 200 && spark.json.pattern === "booking", "idea-spark returns an instant concept");

// 2. validation
const badSubmit = await call("submit-idea.mjs", { method: "POST", body: { package: "prototype", idea: "short" } });
ok(badSubmit.status === 422, "submit-idea rejects incomplete forms");

// 3. good submission creates a Square link with the right amount
const sub = await call("submit-idea.mjs", {
  method: "POST",
  body: { package: "prototype", addons: ["rush"], idea: "Bookings for my mobile dog grooming business with packages", mustHave: "booking requests", name: "Test Person", email: "test@example.com", agreedToScope: true },
});
ok(sub.status === 200 && sub.json.mode === "square" && sub.json.checkoutUrl === "https://square.link/u/TEST", "submit-idea returns a Square checkout URL");
const total = squareBody.order.line_items.reduce((s, l) => s + l.base_price_money.amount, 0);
ok(total === 79900 + 19900, "Square order total = $799 + $199 priority");
ok(squareBody.checkout_options.redirect_url === `https://example.test/success/?ref=${sub.json.id}`, "redirect goes to the success page with the reference");

// 4. webhook with a bad signature is rejected
const event = JSON.stringify({ type: "payment.updated", data: { object: { payment: { id: "PAY1", order_id: "SQORDER1", status: "COMPLETED", amount_money: { amount: 99800, currency: "USD" } } } } });
const badHook = await call("square-webhook.mjs", { method: "POST", body: event, headers: { "x-square-hmacsha256-signature": "nope" } });
ok(badHook.status === 401, "webhook rejects a bad signature");

// 5. webhook with a valid signature marks the order paid
const sig = createHmac("sha256", "sigkey").update("https://example.test/api/square-webhook" + event).digest("base64");
const hook = await call("square-webhook.mjs", { method: "POST", body: event, headers: { "x-square-hmacsha256-signature": sig } });
ok(hook.status === 200, "webhook accepts a valid signature");
const status = await call("order-status.mjs", { path: `/api/order-status?ref=${sub.json.id}` });
ok(status.json.paid === true, "order is now marked paid");

// 6. founding spots count real paid orders
const spots = await call("order-status.mjs", { path: "/api/order-status?spots=1" });
ok(spots.json.taken === 1 && spots.json.left === 9, "founding spots: 1 taken, 9 left");

// 7. admin requires the password and reports revenue
const noAuth = await call("admin.mjs");
ok(noAuth.status === 401, "admin rejects requests without the password");
const admin = await call("admin.mjs", { headers: { authorization: "Bearer test-pass" } });
ok(admin.status === 200 && admin.json.summary.revenue === 99800, "admin shows $998 collected");
const upd = await call("admin.mjs", { method: "PATCH", headers: { authorization: "Bearer test-pass" }, body: { id: sub.json.id, status: "building", note: "Scope confirmed" } });
ok(upd.json.order.status === "building", "admin can move an order to building");

// 8. without Square keys, falls back to manual invoice
delete process.env.SQUARE_ACCESS_TOKEN;
const manual = await call("submit-idea.mjs", { method: "POST", body: { package: "blueprint", idea: "A volunteer sign-up page for our church food pantry", name: "A B", email: "a@b.co", agreedToScope: true } });
ok(manual.json.mode === "manual", "no Square keys → manual invoice mode");

await rm(".data", { recursive: true, force: true });
console.log("\nAll checks passed.");
