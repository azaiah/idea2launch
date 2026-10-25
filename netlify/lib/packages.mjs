// Single source of truth for what Idea2Launch sells.
// Prices are in cents (USD). Change a price here and it changes at checkout.
// The public pricing page lives in public/index.html — keep the two in sync.

export const PACKAGES = {
  blueprint: {
    id: "blueprint",
    name: "Idea Blueprint",
    price: 29900,
    turnaround: "24–48 hours",
    summary: "Concept outline, feature plan, visual mockup and roadmap. No live website.",
  },
  prototype: {
    id: "prototype",
    name: "Idea2Launch Prototype",
    price: 79900,
    turnaround: "3–5 business days",
    summary: "Live website, light admin dashboard, one working feature, private demo, one revision round.",
  },
  plus: {
    id: "plus",
    name: "Idea2Launch Plus",
    price: 149900,
    turnaround: "5–7 business days",
    summary: "Polished multi-section website, dashboard, up to three working features, expanded roadmap, two revision rounds.",
  },
};

// Optional add-on shown on the intake form. Set enabled:false to hide it everywhere.
export const ADDONS = {
  rush: {
    id: "rush",
    name: "Priority build (moves you to the front of the queue)",
    price: 19900,
    enabled: true,
    appliesTo: ["prototype", "plus"],
  },
};

// Founding-customer campaign (Tony's plan: first 10 paid customers).
export const FOUNDING = {
  enabled: true,
  totalSpots: 10,
};

export const STATUSES = [
  "new",          // intake submitted, not yet paid
  "checkout",     // Square link created, waiting on payment
  "paid",         // Square confirmed payment
  "scoping",      // fit check / scope confirmation
  "building",
  "review",       // demo delivered, revision round
  "delivered",
  "refunded",
  "archived",
];

export function priceFor(pkgId, addons = []) {
  const pkg = PACKAGES[pkgId];
  if (!pkg) return null;
  let total = pkg.price;
  const lines = [{ name: pkg.name, amount: pkg.price }];
  for (const a of addons) {
    const addon = ADDONS[a];
    if (addon && addon.enabled && addon.appliesTo.includes(pkgId)) {
      total += addon.price;
      lines.push({ name: addon.name, amount: addon.price });
    }
  }
  return { total, lines };
}
