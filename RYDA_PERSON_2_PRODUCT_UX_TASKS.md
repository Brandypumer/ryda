# RYDA — Person 2 Pre-Demo Polish Tasks

## Assignment

You are **Person 2 — Logged-In Product UX / Forms / Dashboards**.

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

**Branch:** `polish-2/product-ux`

### Primary ownership

Person 2 owns existing feature UI only:

- `client/src/features/identity/**`
- `client/src/features/rides/**`
- `client/src/features/courier/**`
- `client/src/features/driver-ops/**`
- `client/src/features/payments/**`
- `client/src/features/admin/**`

Person 2 must NOT edit:

- `client/src/app/**`
- global navigation
- footer
- public pages
- favicon
- shared application routing

If a new route is needed, export the page/component and report the required route to the captain/Person 1 instead of editing AppRoutes.

### Person 2 goals

- Password eye/show-hide control
- Better Profile page
- Fix empty Book a Ride page
- Improve Ride booking form
- Remove visible Courier latitude/longitude inputs
- Add useful placeholders/help text
- Improve Driver dashboard content hierarchy
- Improve Rider/Courier logged-in screens
- Improve wallet/admin presentation where needed
- Add useful dashboard sections/cards/actions without inventing data
- Provide safe ADMIN bootstrap/access method for demo approval workflow

---

# Your Tasks

---

## P2-T01 — Password Visibility + Auth Form Polish

```text
P2-T01 — Password Visibility and Authentication Form Polish

Read:
- AGENTS.md
- README.md
- this pre-demo polish task file

Confirm branch:
polish-2/product-ux

Work ONLY in:
client/src/features/identity/**

Do not edit AppRoutes/Navigation/global app shell.
Do not modify authentication backend behavior unless a genuine frontend contract defect is found.

GOAL:
Make Login/Register look complete and improve password usability.

IMPLEMENT:
1. Add a show/hide password control to every password input used by Login/Register.
2. Use an accessible button:
   - `type="button"`;
   - clear aria-label such as “Show password” / “Hide password”;
   - keyboard accessible.
3. Prefer a small eye/eye-off SVG/icon rather than text clutter.
4. Add meaningful placeholders, for example:
   - Full name: `e.g. Ebuka Doe`
   - Email: `you@example.com`
   - Phone: `e.g. 08012345678`
   - Password: helpful neutral placeholder, not a real password.
5. Improve spacing, labels, error placement, submit/loading states, and link between Login/Register.
6. Preserve existing role choices and security:
   - RIDER/DRIVER public registration only;
   - ADMIN registration remains impossible.
7. Do not change token storage or auth semantics.

VERIFY:
- password eye does not submit form;
- eye toggles input type correctly;
- error messages do not cause destructive layout jumps;
- Login/Register still compile;
- client build;
- git diff --check.

STOP and provide P2-T01 TASK COMPLETION REPORT.
```

---

## P2-T02 — Rebuild the Empty Book a Ride Experience

```text
P2-T02 — Fix and Polish Book a Ride

Work ONLY in:
client/src/features/rides/**

Do not edit AppRoutes.
Do not rewrite Ride backend logic unless a small compatibility fix is absolutely required and remains inside Ride ownership.

CURRENT PROBLEM:
The deployed “Book a Ride” page appears empty/unusable.

GOAL:
Make the existing Ride booking workflow visibly complete and demo-ready using the already-integrated backend contract.

FIRST:
Inspect the current RideBookingPage exports/render tree and determine why the deployed route appears empty.
Fix the actual rendering problem rather than creating a second competing page.

BOOKING FORM MUST INCLUDE:
- Pickup address
- Destination address
- Number of seats: 1–4
- fare preview
- Private Keke indicator for 4 seats
- clear submit button
- loading/error/success feedback

PRICING:
Use existing shared RYDA config/business contract.
Do not hardcode a competing price source.

Expected:
1 seat = ₦150
2 = ₦300
3 = ₦450
4 = ₦600 / Private Keke

PLACEHOLDERS:
Use useful examples such as:
- Pickup: `e.g. Main Gate`
- Destination: `e.g. Faculty of Engineering`

If coordinate fields already exist in Ride for map purposes, do not expose technical latitude/longitude language unnecessarily to ordinary users unless the existing Ride contract truly requires it.
Prefer address-first UX and preserve backend compatibility.

UI:
- concise explanatory copy;
- clear fare summary;
- seat selector easy to use on mobile;
- empty/loading errors should be understandable;
- do not overload with cards.

Preserve approved payment warning if shown in Ride flow.

VERIFY:
- page is no longer blank;
- 1–4 seats work;
- invalid seats blocked;
- 4 seats shows Private Keke;
- request payload still matches backend;
- client build;
- git diff --check.

STOP and provide P2-T02 TASK COMPLETION REPORT.
```

---

## P2-T03 — Simplify Courier Booking: Remove Visible Latitude/Longitude

```text
P2-T03 — Simplify Courier Sender Form

Work in:
- client/src/features/courier/**

If and ONLY if the backend currently makes latitude/longitude mandatory for create requests, make the smallest compatible Courier-module backend adjustment needed so address-only courier creation works without weakening unrelated validation.
Do not edit shared/root application files.

CURRENT PROBLEM:
The Courier page exposes latitude and longitude fields to normal users.
The project owner wants normal human-readable addresses instead.

GOAL:
Remove visible latitude/longitude inputs from the Courier sender form.

USER-FACING FORM SHOULD FOCUS ON:
- recipient name
- recipient phone
- package description
- pickup address
- drop-off address

Add useful placeholders, e.g.:
- Recipient name: `e.g. Ada Okafor`
- Phone: `e.g. 08012345678`
- Package: `e.g. Document envelope`
- Pickup: `e.g. School Library entrance`
- Drop-off: `e.g. Hostel Block B`

COORDINATE CONTRACT:
Inspect the actual backend model/validation first.

If coordinates are optional already:
- stop sending manual coordinate values from the UI.

If coordinates are currently required:
- make them optional for Courier creation using the smallest Courier-owned server change;
- keep coordinate validation when coordinates are supplied;
- do not fabricate `0,0` coordinates;
- do not send fake coordinates;
- ensure tracking UI gracefully handles missing pickup/drop-off coordinates.

Do NOT add a large geocoding system during this task.
Address-first courier creation is sufficient for the demo.

PRICING:
Preserve fixed ₦150 Courier fare from shared RYDA config.

PAYMENT WARNING:
Preserve exact approved wording where displayed.

VERIFY:
- no latitude/longitude fields visible;
- Courier can be created with addresses;
- invalid supplied coordinates are still rejected if coordinates remain supported by API;
- history/detail does not crash with absent optional pickup/drop-off coordinates;
- tracking degrades gracefully if static endpoint coordinates are unavailable;
- client build;
- backend syntax checks only if backend changed;
- git diff --check.

STOP and provide P2-T03 TASK COMPLETION REPORT.
```

---

## P2-T04 — Profile Page Redesign

```text
P2-T04 — Improve Profile Page

Work ONLY in:
client/src/features/identity/**

CURRENT PROBLEM:
Profile is visually sparse and feels unfinished.

GOAL:
Turn the existing Profile page into a useful account overview without inventing unsupported account settings.

IMPLEMENT:
1. Clear profile header:
   - user name;
   - account role badge;
   - email;
   - useful account summary.
2. Editable section for the fields the backend already allows:
   - fullName
   - phone
3. Read-only/account section for:
   - email
   - role/account type
4. For DRIVER accounts, show a small verification summary if that data is already available through the existing Identity flow:
   - PENDING / APPROVED / REJECTED
   - link/call-to-action to Driver Verification if needed.
5. Add meaningful placeholders to editable inputs.
6. Add save/loading/success/error feedback.
7. Do not pretend users can change fields the backend prohibits.
8. Do not add fake profile-photo upload unless an approved backend contract exists.

DESIGN:
- use sections and hierarchy rather than an empty single card;
- responsive;
- avoid excessive decorative cards.

VERIFY:
- allowed fields update;
- email/role remain protected;
- AuthProvider/storage still refresh after profile update;
- client build;
- git diff --check.

STOP and provide P2-T04 TASK COMPLETION REPORT.
```

---

## P2-T05 — Driver Dashboard / Logged-In Dashboard Polish

```text
P2-T05 — Driver Dashboard and Logged-In Product Polish

Work ONLY in:
- client/src/features/driver-ops/**
- client/src/features/payments/** when required for linked wallet presentation

Do not edit app-level navigation.

CURRENT PROBLEM:
The logged-in application lacks strong dashboard hierarchy/sidebar-like navigation cues and feels sparse.

GOAL:
Make DriverDashboardPage feel like an actual operational dashboard using REAL data already returned by the backend.

DO NOT invent metrics.

IMPROVE THE DASHBOARD WITH:
1. Clear page heading and current online/offline state.
2. Verification status.
3. Financial eligibility/blocking state.
4. Active assignment section.
5. Ride/Courier request feed.
6. Useful summary values already returned by the API, such as completed Ride/Courier counts where available.
7. Wallet/liability summary if already available from integrated APIs.
8. Clear action to go online/offline.
9. Better empty states when no requests exist.
10. Clear distinction between RIDE and COURIER requests.
11. Private Keke indication for Ride requests where applicable.
12. Better mobile stacking.

SIDEBAR / DASHBOARD ITEMS:
Do not edit the global app navigation because Person 1 owns it.
Within the Driver dashboard, add a compact dashboard sub-navigation/action area if useful, linking to EXISTING routes such as:
- Dashboard
- Verification
- Wallet
- Profile

Do not invent inaccessible routes.
If app-level sidebar changes are needed, report them for Person 1/captain integration.

LOCATION:
Preserve the correct Ride/Courier location publisher behavior.
Never run both publishers simultaneously.

VERIFY:
- no fake data;
- active assignment still works;
- acceptance buttons still call correct endpoints;
- blocked driver messaging works;
- build;
- git diff --check.

STOP and provide P2-T05 TASK COMPLETION REPORT.
```

---

## P2-T06 — Rider/Courier/Wallet/Admin Screen Polish + Placeholders

```text
P2-T06 — Polish Remaining Logged-In Screens

Work only inside Person 2 feature ownership.

GOAL:
Remove the obvious “prototype” feeling from the remaining logged-in feature screens without changing business rules.

REVIEW:
- Ride History / active tracking
- Courier sender/history/detail/tracking
- Driver Wallet
- Admin Dashboard
- Driver Verification

FOR EACH RELEVANT SCREEN:
- add clear title/subtitle;
- improve spacing/hierarchy;
- add useful placeholders to text inputs;
- add clear loading state;
- add useful empty state;
- add clear error message placement;
- use concise status badges;
- improve button labels;
- ensure mobile usability.

ADMIN:
Improve readability of:
- pending driver verification;
- users/drivers;
- rides/couriers;
- payments;
- liabilities;
- withdrawals.

Do not fabricate analytics.
Do not remove the existing Approve/Reject/Suspend/Reactivate/Withdrawal actions.

WALLET:
Make balances and withdrawal actions understandable.
Do not imply real bank transfer exists; PAID remains the MVP simulated ledger state.

DRIVER VERIFICATION:
Make file requirements and approval requirement clear.
Keep file validation/security unchanged.

ICONS:
Use simple professional icons only where an icon solution already exists inside the feature or can be implemented without introducing a new package dependency.
Do not use emoji as the primary icon system.

VERIFY:
- functional actions remain wired;
- tables/lists usable on mobile through responsive wrapping/scrolling;
- client build;
- git diff --check.

STOP and provide P2-T06 TASK COMPLETION REPORT.
```

---

## P2-T07 — Safe Demo Admin Bootstrap / Access Method

```text
P2-T07 — Add Safe Admin Bootstrap for Demo Access

GOAL:
Provide the project team a secure, explicit way to obtain an ADMIN account for the demo so driver approvals and administrative actions can actually be performed.

IMPORTANT SECURITY RULES:
- DO NOT add ADMIN to public registration.
- DO NOT add a hidden frontend “make me admin” button.
- DO NOT hardcode an admin password.
- DO NOT add an unauthenticated role-change endpoint.
- DO NOT allow users to submit role=ADMIN during signup.

FIRST:
Inspect the existing User model, password hashing helpers, package scripts, and server structure.

IMPLEMENT A SERVER-SIDE CLI/SEED APPROACH.

Preferred MVP design:
- a script such as `server/scripts/createAdmin.js` or equivalent;
- reads admin credentials from environment variables such as:
  - `ADMIN_EMAIL`
  - `ADMIN_PASSWORD`
  - optionally `ADMIN_FULL_NAME`
- uses the SAME password hashing approach as normal Identity;
- creates an ADMIN safely if it does not exist;
- if the email already belongs to an account, do not silently overwrite unrelated credentials/roles unless the behavior is explicit and safe;
- idempotent enough that accidentally rerunning does not create duplicate accounts.

Add an appropriate server/package script if needed, for example conceptually:
`npm run admin:create`

Do not print the password to logs.
Do not commit real credentials.

If project ownership rules prevent changing the relevant package manifest, create the server script and clearly report the exact captain manifest command required instead.

DOCUMENT:
Provide the captain with exact usage, for example:
1. Set ADMIN_EMAIL and ADMIN_PASSWORD locally/server-side.
2. Point MONGODB_URI to the intended database.
3. Run the admin creation command.
4. Remove ADMIN_PASSWORD from persistent environment configuration afterward if not needed.

VERIFY WITH MOCK/TEST DB LOGIC WHERE PRACTICAL:
- creates ADMIN role;
- public signup still rejects ADMIN;
- no duplicate Admin created on repeat;
- no password appears in response/log;
- normal RIDER/DRIVER auth unaffected.

STOP and provide P2-T07 TASK COMPLETION REPORT.
```

---

## P2-T08 — Logged-In Product Final QA

```text
P2-T08 — Logged-In Product Final QA

This is Person 2's final task.

Do not add new product features.

Review P2-T01 through P2-T07.

VERIFY:

AUTH:
- password visibility works;
- Login/Register forms are polished;
- ADMIN public registration remains blocked.

PROFILE:
- no longer visually sparse;
- allowed updates work;
- protected fields remain protected.

RIDE:
- Book a Ride visibly renders;
- pickup/destination placeholders exist;
- 1–4 seat selector works;
- fare preview works;
- 4 seats = Private Keke;
- submit still uses real API.

COURIER:
- no visible latitude/longitude inputs;
- address-first flow works;
- recipient/package fields clear;
- ₦150 pricing preserved.

DRIVER DASHBOARD:
- useful hierarchy;
- online state;
- verification;
- blocking state;
- active assignment;
- Ride/Courier feed;
- location publisher behavior preserved.

WALLET/ADMIN:
- layouts readable;
- actions preserved;
- no fake metrics.

ADMIN ACCESS:
- secure CLI/bootstrap method documented;
- no public privilege escalation.

GLOBAL FEATURE QA:
- meaningful placeholders where inputs exist;
- loading/error/empty states;
- mobile layout;
- no obvious prototype/debug copy;
- no business logic regressions.

RUN:
- client production build;
- backend syntax/import checks for any backend files touched;
- git diff --check;
- git status.

Produce final PERSON 2 HANDOFF including:
- files modified/created;
- backend compatibility changes, especially Courier coordinates;
- admin bootstrap usage;
- route wiring requests for Person 1/captain;
- any unresolved issue.

STOP. Do not merge branches yourself.
```

---

# CAPTAIN MERGE / INTEGRATION ORDER

After both people finish, the captain should NOT blindly merge both and deploy.

Recommended order:

1. Ensure both branches are pushed and clean.
2. Merge **Person 2 (`polish-2/product-ux`) first** because it changes feature screens and possibly the Courier feature contract/admin seed script.
3. Run build/backend checks.
4. Merge **Person 1 (`polish-1/public-shell`) second** because Person 1 owns AppRoutes/navigation/public shell and can therefore remain the final authority for route/navigation presentation.
5. Resolve only genuine integration conflicts.
6. Wire any Person 2 page exports requested in their handoff.
7. Re-run full client production build.
8. Run server syntax/import smoke checks if Person 2 changed Courier backend/admin seed code.
9. Smoke-test deployed flows before the demo.

---

# FINAL PRE-DEMO ACCEPTANCE CHECKLIST

The final integrated application should satisfy all of the following:

## Public experience

- Landing page exists and looks intentional.
- Header is complete.
- Footer exists.
- Mobile navigation works.
- About page exists.
- How It Works page exists.
- Safety page exists.
- Help/FAQ page exists.
- Privacy Policy exists.
- Terms page exists.
- Favicon is present.
- Browser title/metadata use RYDA.

## Authentication / account

- Login/Register are visually complete.
- Password eye/show-hide works.
- Inputs have useful placeholders.
- Profile looks like a real account page.
- ADMIN cannot register publicly.
- Project team has a safe admin bootstrap method.

## Ride

- Book a Ride is not blank.
- Pickup/destination visible.
- Seats 1–4.
- Fare preview works.
- Private Keke shown at 4 seats.
- Ride history/tracking/payment remains functional.

## Courier

- No visible latitude/longitude form inputs.
- Human-readable pickup/drop-off address flow.
- Recipient/package fields understandable.
- ₦150 fare preserved.
- Tracking/payment/history remain functional.

## Driver

- Dashboard has useful hierarchy/content.
- Online/offline status clear.
- Verification status clear.
- Financial block reason clear.
- Active assignment clear.
- Ride/Courier requests clear.
- Wallet accessible.

## Admin

- Admin can log in using safe seeded/bootstrap account.
- Pending drivers visible.
- Approve/reject works.
- Suspend/reactivate works.
- Ride/Courier/Payment/Liability records readable.
- Withdrawal actions readable and functional.

## Visual quality

- Consistent spacing and typography.
- Clear buttons and form states.
- Useful icons without emoji-heavy styling.
- No fake data/testimonials/partnerships.
- No obvious Vite starter content.
- No obvious debug placeholders.
- Mobile layout works.
- Product name is consistently RYDA.

## Regression safety

- Client production build passes.
- Server import/syntax checks pass for changed backend code.
- Authentication remains secure.
- Ride/Courier pricing unchanged.
- Payment logic unchanged except required UI wiring.
- Socket authorization unchanged.
- Driver verification security unchanged.
- Cross-service active-assignment protection unchanged.
- No `.env` or secrets committed.

# Final Person 2 Handoff Rules

- Do not merge your branch yourself.
- Push your completed branch and provide the final handoff report.
- Your branch should be merged/tested before Person 1's public/app-shell branch.
- Preserve all existing RYDA business logic and security contracts.
