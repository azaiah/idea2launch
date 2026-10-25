// Idea → concept, instantly, with no network.
// Used by the homepage builder (instant preview) and by /api/idea-spark as the
// fallback when no AI key is configured. Keep it dependency-free.

const PATTERNS = [
  {
    id: "store",
    match: /\b(sell|shop|store|product|merch|clothing|apparel|candle|jewel|soap|skincare|cosmetic|boutique|handmade|craft|pre-?order|drop)\w*/i,
    fn: "Product pre-order request",
    cta: "Reserve yours",
    formFields: ["Name", "Product", "Quantity"],
    columns: ["Customer", "Product", "Qty", "Status"],
    sample: [["Nia R.", "Signature set", "2", "New"], ["Omar F.", "Gift bundle", "1", "Confirmed"]],
    features: ["Product showcase with photos and prices", "Pre-order / reserve form", "Owner dashboard of orders", "Order confirmation email"],
    roadmap: ["Online checkout", "Inventory tracking", "Shipping and pickup options", "Customer reviews"],
    audience: "customers who want your products without DM back-and-forth",
  },
  {
    id: "booking",
    match: /\b(book|booking|appointment|schedul|reserv|salon|barber|groom|detail|cleaning|tutor|lesson|session|class|clinic|spa|nail|lash|braid|photograph|trainer|coach)\w*/i,
    fn: "Online booking request",
    cta: "Book a time",
    formFields: ["Name", "Service", "Preferred date"],
    columns: ["Client", "Service", "Date", "Status"],
    sample: [["Jordan M.", "Full service", "Fri 10:00", "New"], ["Priya S.", "Consultation", "Sat 1:30", "Confirmed"]],
    features: ["Service menu with prices", "Booking request form", "Owner dashboard of upcoming requests", "Automatic confirmation email"],
    roadmap: ["Card deposits at booking", "Text-message reminders", "Staff calendars", "Repeat-client loyalty"],
    audience: "people who want to book you without the back-and-forth",
  },
  {
    id: "marketplace",
    match: /\b(marketplace|connect|match|buyers?|sellers?|vendors?|hire|freelanc|gig|rent|rental|swap|trade|listing)\w*/i,
    fn: "Listing submission + browse",
    cta: "Post a listing",
    formFields: ["Your name", "What you offer", "Price"],
    columns: ["Listing", "Owner", "Price", "Status"],
    sample: [["Weekend DJ set", "Marcus T.", "$350", "Live"], ["Moving help (2 hrs)", "Ana R.", "$90", "Pending"]],
    features: ["Public listings page", "Submit-a-listing form", "Admin approval queue", "Contact-the-owner button"],
    roadmap: ["User accounts and profiles", "Payments with platform fee", "Reviews and ratings", "Search and filters"],
    audience: "two sides of a market that can't easily find each other",
  },
  {
    id: "food",
    match: /\b(food|meal|restaurant|cater|bakery|bake|cake|kitchen|chef|truck|menu|order|deliver|grocery|coffee|drink|juice|bbq)\w*/i,
    fn: "Online order request",
    cta: "Start an order",
    formFields: ["Name", "Items", "Pickup time"],
    columns: ["Customer", "Items", "Pickup", "Status"],
    sample: [["Keisha L.", "2 × Family tray", "5:30 PM", "New"], ["Dev P.", "Dozen cupcakes", "Tomorrow", "Prepping"]],
    features: ["Menu with photos and prices", "Order request form", "Kitchen dashboard of incoming orders", "Order-ready notification"],
    roadmap: ["Online payment at checkout", "Delivery zones", "Pre-order calendar", "Customer rewards"],
    audience: "hungry customers who want to order without calling",
  },
  {
    id: "nonprofit",
    match: /\b(nonprofit|non-profit|charity|donat|volunteer|church|ministry|community|outreach|mentor|youth|food bank|pantry|shelter|foundation|mission|donor)\w*/i,
    fn: "Volunteer & donor sign-up",
    cta: "Get involved",
    formFields: ["Name", "How you'll help", "Email"],
    columns: ["Name", "Interest", "Joined", "Status"],
    sample: [["Ruth A.", "Saturday volunteer", "Today", "New"], ["Carlos D.", "Monthly donor", "Yesterday", "Contacted"]],
    features: ["Mission and impact page", "Volunteer / donor sign-up form", "Staff dashboard of supporters", "Event announcements"],
    roadmap: ["Online giving", "Volunteer shift scheduling", "Member portal", "Impact reporting"],
    audience: "supporters who want to help but don't know how to start",
  },
  {
    id: "learning",
    match: /\b(course|teach|learn|training|workshop|academy|school|curriculum|lesson plan|ebook|cohort|bootcamp|certif)\w*/i,
    fn: "Course enrollment",
    cta: "Join the waitlist",
    formFields: ["Name", "Email", "Goal"],
    columns: ["Student", "Course", "Enrolled", "Status"],
    sample: [["Tasha W.", "Starter cohort", "Today", "New"], ["Ben K.", "Starter cohort", "Mon", "Paid"]],
    features: ["Course landing page with outline", "Enrollment / waitlist form", "Instructor dashboard of students", "Welcome email"],
    roadmap: ["Paid enrollment", "Lesson library with video", "Progress tracking", "Certificates"],
    audience: "learners ready to pay for a clear path",
  },
  {
    id: "events",
    match: /\b(event|ticket|party|wedding|festival|concert|conference|meetup|tour|venue|rsvp)\w*/i,
    fn: "RSVP / ticket request",
    cta: "Reserve a spot",
    formFields: ["Name", "Guests", "Email"],
    columns: ["Guest", "Party size", "Event", "Status"],
    sample: [["Monique B.", "4", "Spring mixer", "Confirmed"], ["Eli G.", "2", "Spring mixer", "New"]],
    features: ["Event page with details and countdown", "RSVP form", "Host dashboard of guests", "Confirmation email"],
    roadmap: ["Paid tickets", "QR check-in", "Waitlist", "Sponsor page"],
    audience: "guests who need one clear place to say yes",
  },
  {
    id: "membership",
    match: /\b(member|subscription|subscribe|club|community|network|group|portal|fitness|gym|app for)\w*/i,
    fn: "Member sign-up",
    cta: "Become a member",
    formFields: ["Name", "Email", "Plan"],
    columns: ["Member", "Plan", "Joined", "Status"],
    sample: [["Andre J.", "Founding", "Today", "Active"], ["Lena O.", "Monthly", "Sun", "Trial"]],
    features: ["Membership landing page", "Sign-up form with plan choice", "Admin member list", "Member welcome email"],
    roadmap: ["Recurring billing", "Members-only area", "Messaging", "Mobile app"],
    audience: "people who want to belong to something you run",
  },
  {
    id: "tracker",
    match: /\b(track|tracker|manage|inventory|crm|log|dashboard|report|monitor|organi[sz]e|tool|calculator|estimate|quote|invoice|shift|swap|roster|availability|schedule)\w*/i,
    fn: "Record entry + tracking",
    cta: "Add a record",
    formFields: ["Item", "Owner", "Due date"],
    columns: ["Record", "Owner", "Due", "Status"],
    sample: [["Job #1042", "Team A", "Fri", "In progress"], ["Job #1043", "Team B", "Mon", "New"]],
    features: ["Simple public intake page", "Record entry form", "Dashboard with status tracking", "Export to spreadsheet"],
    roadmap: ["User logins and roles", "Automated reminders", "Reports and charts", "Integrations"],
    audience: "a team tired of tracking this in texts and spreadsheets",
  },
];

const GENERIC = {
  id: "generic",
  fn: "Lead capture / early access",
  cta: "Get early access",
  formFields: ["Name", "Email", "What you need"],
  columns: ["Name", "Email", "Interest", "Status"],
  sample: [["Alicia N.", "alicia@…", "Early access", "New"], ["Sam V.", "sam@…", "Pricing", "Contacted"]],
  features: ["Landing page that explains the idea", "Early-access sign-up form", "Dashboard of interested people", "Confirmation email"],
  roadmap: ["User accounts", "Payments", "Core product features", "Mobile app"],
  audience: "the first people who need what you're building",
};

const STOP = new Set(("a an the and or for to of in on with my our your that this it is be app website site platform " +
  "business idea people who want would like help make build create where can will just simple online service " +
  "company startup thing something using use get let lets allow allows users user customers customer local " +
  "book books booking bookings order orders ordering online mobile sign signs ups signup signups where pick package time " +
  "hire find request requests page portal system site sites list listing listings marketplace help helps " +
  "track tracking manage managing team teams subscription subscribe box sell selling handmade natural").split(" "));

function titleCase(w) {
  if (w.length <= 3) return w.toUpperCase(); // dj → DJ, bbq → BBQ
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

export function suggestName(idea) {
  const words = (idea.toLowerCase().match(/[a-z]{3,}/g) || []).filter((w) => !STOP.has(w));
  if (!words.length) return "LaunchPad";
  const core = titleCase(words[0].replace(/(ing|ers|s)$/, "") || words[0]);
  const suffixes = ["Hub", "Go", "Spot", "Desk", "Base", "Link"];
  const s = suffixes[(idea.length + words.length) % suffixes.length];
  if (core.length > 9) return core.slice(0, 12);
  return core + s;
}

export function tagline(idea) {
  let t = idea.trim().replace(/\s+/g, " ");
  t = t.replace(/^(i want to|i'd like to|i would like to|my idea is|an? (app|website|platform|site) (that|to|for|where)|build|create|make)\s+/i, "");
  t = t.charAt(0).toUpperCase() + t.slice(1);
  if (t.length > 90) t = t.slice(0, 87).replace(/\s\S*$/, "") + "…";
  return t.replace(/[.!]+$/, "");
}

export function buildConcept(ideaRaw) {
  const idea = String(ideaRaw || "").slice(0, 600);
  // Score every pattern by how many of its keywords appear; best match wins.
  let p = GENERIC, best = 0;
  for (const x of PATTERNS) {
    const n = (idea.match(new RegExp(x.match.source, "gi")) || []).length;
    if (n > best) { best = n; p = x; }
  }
  const recommended = p.id === "marketplace" || p.id === "membership" ? "plus" : "prototype";
  return {
    source: "instant",
    pattern: p.id,
    name: suggestName(idea),
    tagline: tagline(idea) || "Your idea, working.",
    audience: p.audience,
    workingFunction: p.fn,
    cta: p.cta,
    formFields: p.formFields,
    columns: p.columns,
    sample: p.sample,
    features: p.features,
    roadmap: p.roadmap,
    recommended,
  };
}
