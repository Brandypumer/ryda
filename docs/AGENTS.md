# RYDA — Person 1 Pre-Demo Polish Tasks

## Assignment

You are **Person 1 — Public Experience / App Shell / Brand Polish**.

The RYDA MVP is functionally integrated, but the deployed product currently feels incomplete visually and several user-facing workflows need polish before the demo.

This work is intentionally split between **two people** so both can work in parallel without repeatedly editing the same files.

The goal is **not** to redesign the backend or add post-MVP functionality. The goal is to make the existing product look deliberate, complete, trustworthy, and demo-ready while preserving the already-integrated Identity, Ride, Courier, DriverOps, Payments, Admin, Socket.IO, Cloudinary, Paystack, and authorization logic.

---

# Shared Rules — BOTH PEOPLE MUST FOLLOW

1. Start from the latest `integration` branch.
2. Do not work directly on `integration` or `main`.
3. Do not change backend business rules unless a task explicitly requires a small compatibility fix.
4. Do not change pricing:
   - Ride = ₦150 per seat.
   - 4 seats = Private Keke.
   - Courier = ₦150.
   - Platform fee = 10%.
5. Do not weaken authentication, authorization, socket-room security, financial idempotency, or admin protections.
6. Do not add public ADMIN registration.
7. Do not duplicate models or payment logic.
8. Preserve the canonical client token key: `ryda.auth.token`.
9. Preserve environment-driven API/socket configuration.
10. Keep the visual design professional and human-made. Avoid the common “AI-generated SaaS template” look:
    - no excessive gradients;
    - no giant meaningless hero text;
    - no excessive rounded cards everywhere;
    - no random glassmorphism;
    - no emoji as primary interface icons;
    - no fake statistics or testimonials;
    - no invented university partnerships;
    - no fake customer counts;
    - no fake safety guarantees.
11. Use clear hierarchy, useful whitespace, restrained shadows, consistent typography, useful icons, and strong mobile responsiveness.
12. Do not use external image hotlinks that may disappear. Prefer local assets, simple SVG artwork, or explicitly supplied/generated assets.
13. Every task must end with a TASK COMPLETION REPORT and STOP. Do not automatically begin the next task.
14. Before each task run:
    - `git branch --show-current`
    - `git status`
15. After each task run the narrowest relevant checks plus `git diff --check`.
16. Never commit `.env` files, API keys, passwords, JWT secrets, Cloudinary secrets, Paystack secrets, or MongoDB credentials.

---

## Your Branch and Ownership

**Branch:** `polish-1/public-shell`

### Primary ownership

Person 1 owns the presentation shell and public pages:

- `client/src/app/**`
- `client/src/features/public/**` if created
- `client/src/shared/ui/**` if created
- public/static assets used for branding
- global application styling/layout files
- favicon / metadata

Person 1 may read feature modules but should not rewrite Ride, Courier, DriverOps, Payments, Admin, or Identity business logic.

### Person 1 goals

- Proper landing page
- Stronger header/navigation
- Footer
- Public informational pages
- Privacy Policy
- Terms
- Safety page
- Help/FAQ page
- About page
- Better unauthenticated experience
- Favicon / basic brand assets
- Cohesive visual language
- Route-level shells and layout
- Better overall responsiveness

---

# Your Tasks

---

## P1-T01 — Establish RYDA Visual System and Application Shell

Copy everything below into Codex:

```text
P1-T01 — Establish RYDA Visual System and Application Shell

Read:
- AGENTS.md
- README.md
- this pre-demo polish task file

Confirm branch:
polish-1/public-shell

Work ONLY on the public/app-shell visual layer.

Do not change backend logic.
Do not modify Ride/Courier/Payments/Admin/Identity business logic.

GOAL:
Create a coherent visual system so RYDA no longer feels like disconnected prototype screens.

DESIGN DIRECTION:
RYDA is a campus Keke mobility and courier product.
The interface should feel:
- modern;
- reliable;
- youthful but not childish;
- practical;
- mobile-first;
- clean enough for a real transport product.

Avoid generic AI-SaaS styling.
Do not create fake metrics/testimonials/partners.

IMPLEMENT:
1. Inspect current global CSS/Tailwind setup and existing application shell.
2. Establish consistent:
   - page max-widths;
   - horizontal padding;
   - section spacing;
   - typography hierarchy;
   - button hierarchy;
   - form focus states;
   - card/border/shadow treatment;
   - status badge treatment;
   - responsive breakpoints.
3. Keep accessibility:
   - visible keyboard focus;
   - sufficient contrast;
   - semantic buttons/links;
   - meaningful labels.
4. Create small reusable presentation primitives in Person 1-owned shared UI files only if genuinely useful, such as:
   - PageContainer
   - SectionHeading
   - EmptyState
   - AppLogo/BrandMark
   - simple Icon wrapper if needed
5. Do not force every screen into cards.
6. Do not use emoji as interface icons.
7. Do not make functional changes to feature modules.

VERIFY:
- client production build;
- no broken existing routes;
- responsive shell at mobile/tablet/desktop widths;
- git diff --check.

STOP and provide P1-T01 TASK COMPLETION REPORT.
```

---

## P1-T02 — Build a Real Landing Page

```text
P1-T02 — Build a Real RYDA Landing Page

Read the current app routing/navigation and preserve all authenticated feature routes.

Work only on Person 1 ownership.

GOAL:
Replace the empty/minimal public root experience with a polished RYDA landing page.

The landing page must explain the real MVP, not invented features.

CONTENT STRUCTURE:

1. HERO
- RYDA product name/mark.
- Clear headline around campus rides and package delivery.
- Short supporting copy.
- Primary CTA: Book a Ride / Get Started.
- Secondary CTA: Send a Package or Become a Driver depending on existing route availability.
- A tasteful transport/campus visual area.

2. CORE SERVICES
Explain the two real services:
- Campus Keke rides
- Campus package/document delivery

3. HOW RIDES WORK
Example 3-step flow:
- Enter pickup/destination
- Choose 1–4 seats
- Track the accepted ride

Mention:
- ₦150 per seat
- 4 seats = Private Keke

4. HOW COURIER WORKS
- Enter pickup/drop-off address
- Add recipient/package information
- Track delivery

Mention fixed ₦150 MVP courier fare.

5. SAFETY / PLATFORM SECTION
Use factual wording only.
Mention:
- authenticated accounts;
- driver verification workflow;
- live trip/delivery tracking where available;
- in-platform payment records.

Do NOT claim guaranteed safety.

Include the approved payment warning where appropriate:
“For your safety and transaction traceability, make payments only through RYDA. Payments made outside RYDA cannot be verified through our platform and are not covered by RYDA payment records or dispute support.”

6. DRIVER CTA
Explain verified drivers can receive Ride/Courier requests.
Link to registration/login/driver verification flow as appropriate.

7. FINAL CTA
Useful final action buttons.

VISUAL REQUIREMENTS:
- polished but restrained;
- no fake dashboard screenshots unless created from actual RYDA UI;
- no fake testimonials;
- no fake campus partnerships;
- no fake download-store badges;
- responsive mobile layout.

IMAGE/ILLUSTRATION:
If the repository does not yet have suitable imagery, create a tasteful local SVG/illustration composition that communicates campus Keke mobility rather than hotlinking random internet images.
If a generated image asset is later supplied by the project owner, keep the hero easy to swap to that asset.

ROUTING:
Root `/` should show the landing page for unauthenticated users.
Do not break authenticated navigation.

VERIFY:
- direct `/` load;
- CTA links;
- mobile responsiveness;
- client production build;
- git diff --check.

STOP and provide P1-T02 TASK COMPLETION REPORT.
```

---

## P1-T03 — Upgrade Header / Navigation

```text
P1-T03 — Upgrade RYDA Header and Navigation

GOAL:
The current header is too sparse. Make it look deliberate and useful without becoming crowded.

Work only in Person 1-owned app-shell files.

REQUIREMENTS:

PUBLIC HEADER:
- RYDA brand/logo on left.
- useful public links such as:
  - Home
  - How It Works
  - Safety
  - Help
- Login
- clear Get Started/Register CTA
- responsive mobile menu.

AUTHENTICATED HEADER/NAV:
Preserve role-aware navigation.
Do not expose links users cannot use.

RIDER navigation should make relevant workflows reachable, including existing routes for:
- Book Ride
- Ride History
- Courier
- Profile

DRIVER navigation should expose existing routes for:
- Driver Dashboard
- Verification
- Wallet
- Profile

ADMIN navigation should expose:
- Admin Dashboard
- Profile/logout where appropriate

LOGOUT:
Preserve existing AuthProvider/logout behavior.

DESIGN:
- use professional iconography only if an icon solution already exists or can be implemented locally without breaking dependencies;
- active route state should be visible;
- no oversized navigation;
- sticky header is acceptable if it improves usability;
- mobile navigation must be keyboard accessible.

Do not create fake routes.
If a required route is not yet wired, report it instead of inventing duplicate pages.

VERIFY:
- public navigation;
- Rider navigation;
- Driver navigation;
- Admin navigation;
- mobile menu;
- logout;
- build;
- git diff --check.

STOP and provide P1-T03 TASK COMPLETION REPORT.
```

---

## P1-T04 — Add Footer and Public Trust Pages

```text
P1-T04 — Footer + Public Trust Pages

GOAL:
Add the public pages expected from a presentable web application and connect them through a real footer.

Create concise, factual MVP pages for:

1. About RYDA
2. How It Works
3. Safety
4. Help / FAQ
5. Privacy Policy
6. Terms of Use

Do not invent company registration details, physical addresses, support phone numbers, partnerships, compliance certifications, or legal promises that are not present in the repository/project information.

If no official support contact has been supplied, use neutral wording such as:
“Contact the RYDA team through the support channel provided by your campus/project administrator.”
Do not fabricate an email address.

PRIVACY PAGE:
Keep it understandable and MVP-appropriate.
Describe categories actually relevant to RYDA, such as:
- account/profile information;
- driver verification documents/Cloudinary URLs;
- Ride/Courier booking details;
- location data during active tracking;
- payment transaction references/status;
- service/security logs where applicable.

Do not claim legal compliance certifications that have not been established.

TERMS PAGE:
Cover basic use of the MVP, account responsibility, driver/rider responsibilities, prohibited misuse, payment records, cancellation, service availability, and reasonable limitation wording.
Do not write extreme legal claims.

SAFETY PAGE:
Explain:
- driver verification;
- live location during active service;
- keeping payments within RYDA;
- emergency/common-sense campus safety guidance.
Do not claim RYDA can guarantee safety or emergency response.

HELP/FAQ:
Include practical questions for:
- booking seats;
- Private Keke;
- courier deliveries;
- payment;
- verification;
- tracking;
- cancelled jobs;
- account/profile help.

FOOTER:
Add:
- RYDA brand/short description;
- product links;
- support/help links;
- legal links;
- concise copyright text based on current year dynamically if practical.

Do not make the footer enormous.

VERIFY:
- every footer link resolves;
- SPA refresh works with existing Vercel config;
- mobile layout;
- build;
- git diff --check.

STOP and provide P1-T04 TASK COMPLETION REPORT.
```

---

## P1-T05 — Favicon, Metadata, Brand Assets and Visual Details

```text
P1-T05 — Favicon, Metadata and Brand Assets

GOAL:
Remove the unfinished browser/tab appearance and add restrained brand details.

Work only in Person 1 ownership.

IMPLEMENT:
1. Add a simple RYDA favicon that works at small sizes.
   - Prefer a clean local SVG/favicon asset.
   - Use a simple R/route/mobility-inspired mark.
   - Do not copy another company's logo.
2. Set useful document metadata:
   - title;
   - description;
   - theme-color if appropriate;
   - favicon references.
3. Ensure browser title uses RYDA rather than Vite/default text.
4. Remove obvious Vite starter assets if they are still user-visible and unused.
5. Add subtle useful visual assets/illustrations to public pages where they genuinely improve comprehension.
6. Avoid decorative image overload.

If generating illustration-like assets in code, use local SVGs rather than base64 blobs.
Do not add large unoptimized files.

VERIFY:
- favicon appears in built HTML configuration;
- no broken asset paths;
- production build;
- git diff --check.

STOP and provide P1-T05 TASK COMPLETION REPORT.
```

---

## P1-T06 — Public/App-Shell Final QA

```text
P1-T06 — Public/App-Shell Final QA

This is Person 1's final task.

Do NOT add new features.

Review everything completed in P1-T01 through P1-T05.

VERIFY:
- landing page looks complete on mobile and desktop;
- header is not sparse;
- public mobile navigation works;
- footer appears where appropriate;
- About/How It Works/Safety/Help/Privacy/Terms routes work;
- no obvious Vite/default starter branding remains;
- favicon/metadata are wired;
- logged-in route links remain role-aware;
- no broken links;
- no horizontal overflow;
- keyboard focus is visible;
- no obvious fake content;
- no project name `Rida` remains in user-facing copy where it should be `RYDA`;
- client production build passes;
- git diff --check passes.

Produce final PERSON 1 HANDOFF including:
- files created/modified;
- routes added;
- any AppRoutes/navigation changes;
- any assets added;
- any dependency changes;
- captain merge notes.

STOP. Do not perform captain integration.
```

---

# Final Person 1 Handoff Rules

- Do not merge your branch yourself.
- Push your completed branch and provide the final handoff report.
- The captain will merge/test this branch after Person 2's feature/UI branch.
- Preserve all existing RYDA business logic and security contracts.
