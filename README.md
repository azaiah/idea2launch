# Idea2Launch by DataIsData

**Turn someone's idea into a working website + dashboard in days, for a fixed price.**
This repo is the full customer-facing service: the marketing site, a live "see your idea working" builder, a 4-step intake form, Square checkout, automatic paid-status via Square webhooks, and a password-protected owner dashboard.

- Static site (no build step) in `public/`
- Netlify Functions (Node 20+) in `netlify/functions/`
- Orders stored in **Netlify Blobs** (zero setup, no database to manage)
- Payments through **Square** (hosted checkout pages)
- Optional AI concept drafts through the Claude API (works without it)

---

## 1. Open and run it locally (Cursor)

```bash
npm install
npm run dev        # http://localhost:8888
npm test           # 13 end-to-end checks of the money path (Square mocked)
```

Local orders are saved in `.data/` (git-ignored). The dev server reads a `.env` file if you create one from `.env.example`.

| Page | What it is |
|---|---|
| `/` | Homepage with the live idea builder, pricing, FAQ |
| `/start/` | Intake form → checkout. Accepts `?package=blueprint|prototype|plus` |
| `/success/` | Where Square sends customers after paying |
| `/admin/` | Owner dashboard (password = `ADMIN_PASSWORD`) |
| `/guides/` | Three SEO/AEO articles that answer the questions buyers ask |
| `/idea` | Short link for social posts → intake form with UTM tags |

## 2. Push to GitHub

```bash
git init
git add .
git commit -m "Idea2Launch MVP"
git branch -M main
git remote add origin https://github.com/YOUR-ACCOUNT/idea2launch.git
git push -u origin main
```

## 3. Deploy to Netlify

1. Netlify → **Add new site → Import from Git** → pick the repo.
2. Build settings are read from `netlify.toml` (publish `public`, functions `netlify/functions`). Leave the build command as-is.
3. **Site configuration → Environment variables**, add at least:
   - `ADMIN_PASSWORD`: a long password for `/admin`
4. Deploy. Then rename the site (Site configuration → Change site name), for example `idea2launch-dataisdata`.
5. If your final URL is different from `https://idea2launch-dataisdata.netlify.app`, run:
   ```bash
   npm run set-domain -- https://YOUR-FINAL-URL
   ```
   and push again. This updates canonical tags, the sitemap, schema and llms.txt.
6. **Forms → enable form detection** so every intake also sends you an email (Forms → Form notifications → add your email). This is a backup to the dashboard.

## 4. Connect Square

You have three levels. Start at whichever is fastest today, and upgrade later.

### Level A: take money tonight, no keys (manual)
Do nothing. Intakes land in `/admin` and your email, and the customer sees "Your invoice is on its way." Send a **Square invoice** from the Square app, then mark the order **paid** in `/admin`.

### Level B: static payment links (5 minutes)
In the Square Dashboard → **Online → Payment links → Create link**, make three links ($299, $799, $1,499). Paste them into Netlify env vars:
```
SQUARE_LINK_BLUEPRINT=https://square.link/u/...
SQUARE_LINK_PROTOTYPE=https://square.link/u/...
SQUARE_LINK_PLUS=https://square.link/u/...
```
Customers go straight to payment after the form. Mark orders paid in `/admin`. (If someone picks the Priority add-on, they get the invoice flow, since a static link can't add it.)

### Level C: full automation (recommended, about 15 minutes)
1. Go to **developer.squareup.com → Applications → +** and create an app called "Idea2Launch".
2. **Credentials**: copy the **Production Access token**. Use the Sandbox token first if you want to test.
3. **Locations**: copy your **Location ID**.
4. **Webhooks → Subscriptions → Add subscription**
   - URL: `https://YOUR-SITE/api/square-webhook`
   - Events: `payment.updated` (you can also add `payment.created`)
   - Copy the **Signature key**
5. Add these to Netlify env vars and redeploy:
```
SQUARE_ENVIRONMENT=production        # or sandbox while testing
SQUARE_ACCESS_TOKEN=...
SQUARE_LOCATION_ID=...
SQUARE_WEBHOOK_SIGNATURE_KEY=...
SUPPORT_EMAIL=you@dataisdata.com     # shown on the Square checkout page
```
Now each intake creates its own itemized Square checkout. When the customer pays, the webhook marks the order **paid** automatically and the founding-spots counter on the homepage updates.

In `/admin` you can also generate a **new Square link with a custom amount**, for upgrades or bigger quoted scopes.

## 5. Optional: AI concept drafts
Add `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`, default `claude-haiku-5-5`) to make the homepage builder's concept smarter. Without it, the instant rules-based concept is used, so it always works and costs nothing.

## 6. Daily operations
1. New idea arrives → email + `/admin`.
2. Paid → open it in `/admin` → **Copy build brief** → paste into Claude Code or Cursor to scaffold the build.
3. Email the customer their written scope within 1 business day (template in `LAUNCH-KIT.md`).
4. Move the status: `scoping → building → review → delivered`. Paste the demo link into the order.
5. Offer Launch Care ($99+/mo) or quote the full build.

## 7. Change prices or packages
- Checkout prices: `netlify/lib/packages.mjs` (amounts in cents)
- Display prices: `public/index.html`, `public/start/index.html`, `public/assets/js/start.js`, plus the schema at the top of `index.html` and `public/llms.txt`
- Founding campaign size: `FOUNDING.totalSpots` in `packages.mjs`
- Turn off the Priority add-on: set `ADDONS.rush.enabled = false` and remove the checkbox in `public/start/index.html`

## 8. SEO, AEO and GEO: what's built in
- One H1 per page, semantic HTML, descriptive links, fast self-hosted fonts, compressed WebP images
- JSON-LD: Organization, WebSite, Service with an OfferCatalog (real prices), HowTo, FAQPage, Article with a named author, BreadcrumbList
- Answer-first content: each guide opens with a "short answer" box, and comparison tables are plain HTML that AI engines can quote
- `robots.txt` explicitly welcomes AI crawlers (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended and more)
- `llms.txt` and `llms-full.txt` give AI assistants a clean, citable summary of the service
- `sitemap.xml`, canonical URLs, Open Graph and Twitter cards, a 1200×630 share image

**After deploy:** submit the sitemap in Google Search Console and Bing Webmaster Tools, and validate with the Rich Results Test. Then keep adding real case studies (with permission) to `/guides/`, since fresh, specific, first-hand content is what gets cited.

## 9. Before you go live: review these business terms
These are in the copy and in `/terms/`. Change any that you don't want to promise:
- **Fit guarantee**: full refund if the idea doesn't fit, before work starts
- **Blueprint credit**: $299 credited toward a build within 30 days
- **Ownership**: content and design are the customer's once paid; DataIsData keeps its reusable components
- **Demo hosting**: kept online for 30 days after delivery
- **Priority build**: +$199
- **Launch Care**: from $99/month
- Have a lawyer glance at `/terms/` and `/privacy/`.

## 10. Brand assets (`brand/`)
Idea2Launch has its own mark: the "2" from the name sweeping into a launch arrow, with a yellow idea spark. It's always shown as **presented by DataIsData**, with the DataIsData circle.
- `idea2launch-profile-picture-1024.png`: profile picture for Facebook, Instagram, LinkedIn and TikTok
- `idea2launch-lockup-light.png` / `-dark.png` / `-transparent.png`: horizontal logo for banners, flyers and video end cards
- `idea2launch-mark-navy.png` / `-white.png`: the icon alone
- `concepts/`: the original Kie.ai concepts (concept 3 was chosen)
- Colors: navy `#14213D`, highlighter yellow `#FFD84D`, paper `#F3F5F8`, blueprint blue `#3B6FE0`. Font: Archivo (self-hosted in `public/assets/fonts`).
