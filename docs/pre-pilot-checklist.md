# Pre-Pilot Checklist — Rentala

**Date:** 2026-08-19
**Branch reviewed:** `staging` @ `b250de9`
**Goal:** what must be true before the camera club's gear system is handed to real members for small-scale testing.

Ordered by priority. **P0** items have no workaround at the gear desk and expose real people's data — do not send a link to a real user until these are done. **P1** items will produce bad pilot data or unanswerable support tickets. **P2** items can be fixed during or after the pilot.

Every item cites where the evidence is. Verification status for each claim is in the [appendix](#appendix-how-this-was-verified).

---

## P0 — Blockers

### Security: unauthenticated endpoints leaking member data

> **Done 2026-08-22** — all five route gates are in the working tree, uncommitted. Backend suite 134 passing (was 130), backend + frontend typecheck clean. ⚠️ These close **anonymous** access only: any authenticated member can still list the full directory. That needs the ADMIN gate below.

- [x] **Require auth on `GET /api/v1/users`** — `backend/src/user/user.routes.ts`
  Was returning every user's name, email, role and id to anyone who asks — confirmed live at HTTP 200 with 8 real email addresses. Now `requireAuth`. **Still needs the ADMIN gate** to stop member-to-member directory access.

- [x] **Require auth + ownership on `GET /api/v1/users/:id/loans`**
  `LoanService.getLoansByUser` now takes `requestingUserId` and throws `NotFoundError` (not 403) for a foreign id, so the response doesn't confirm whether that user exists. Check runs before the query — no lookup on foreign ids.

- [x] **Require auth on `GET /api/v1/users/:id`** — plus self-only, same NotFound-over-403 pattern in `UserService.getUserById`.

- [x] **Require auth on `POST /api/v1/gear`** — `gear.routes.ts`
  No frontend change needed; `admin_.gear.new.tsx:90` already posts with `credentials: 'include'`. `GET /gear` deliberately left public so logged-out browsing still works, with a regression test pinning that. **Still needs the ADMIN gate.**

- [x] **Deleted `POST /api/v1/users`**
  Route, `UserController.createUser`, `UserService.createUser`, `user.schema.ts`, and `CreateUserSchema`/`CreateUserInput` from shared all removed. A route test asserts the path 404s, guarding against reintroduction.

- [ ] **Add ownership check to `processReturn`** — `backend/src/loan/loan.service.ts:143`
  Takes only `loanItemIds`; never checks who's asking. Any logged-in member can return or cancel any other member's gear. This is `CODEAUDIT.md:3`, still unfixed. Fix pattern already exists in `pickupLoan` (`loan.service.ts:87-89`): take `requestingUserId`, load the parent loan via the item's `loanId`, assert `loan.userId === requestingUserId`, throw `NotFoundError` (not 403 — don't confirm the id exists).

- [ ] **Rate-limit `/api/auth/*`** — `backend/src/index.ts:26`
  Sign-in brute force is currently unbounded.

- [ ] **Protect or disable `/api-docs` in staging** — `index.ts:34`
  Swagger UI publicly documents the whole API surface, including the open endpoints above.

### Can't actually run the club

- [ ] **Create an admin bootstrap path**
  `backend/prisma/seed.ts` seeds 5 gear items and returns early if any gear exists — it creates no users. A fresh staging DB has zero users and zero admins, and the deploy job runs this seed (`.github/workflows/deploy.yml:83-87`). Options: a `promote-admin` script taking an email, or seed an admin from env vars. Also fix `backend/changelog.md:75`, which still claims the seed creates `alice@cameraclub.fi`/`bob@cameraclub.fi` with password `password123` — that was removed in commit `897647a`.

- [ ] **Verify whether `role` reaches the session** — `backend/src/lib/auth.ts:15-17`
  ⚠️ **Check this first — it determines the shape of all RBAC work below.** `betterAuth()` declares no `user.additionalFields`, so `session.user` probably does not carry `role` even though the column exists. Confirm before planning.

- [ ] **Implement RBAC across all three layers**
  `role` appears nowhere in backend logic today — only in Prisma's generated types and the OpenAPI doc. Three places need changing together:
  1. `src/lib/auth.ts` — expose `role` on the session user.
  2. `src/middleware/requireAuth.ts:20` — the `session.user as unknown as User` cast makes `req.user.role` **typecheck while being `undefined` at runtime**. A naive role check will compile, pass review, and silently misbehave. Type `req.user` to what better-auth actually returns, then add a `requireAdmin` middleware.
  3. `frontend/src/store/useAuthStore.ts:4-8` — `AuthUser` has no `role`, so the nav shows the Admin link to everyone (`__root.tsx:23`) and `/admin` renders for any logged-in member (`admin.tsx:100`).

- [ ] **Build gear edit / delete / status change**
  Create, list and get only. No way to fix a typo'd serial number or mark a lens `MAINTENANCE` or `LOST` — the enum values exist in the schema and are filtered on in `gear.service.ts:10`, but nothing can set them. Today the only fix path is psql.

- [ ] **Build the admin loan view**
  The dashboard shows two numbers — Total Users and Active Rents (`admin.tsx:61-68`). There is no list of who has what, no overdue list, and no way to mark an item returned on a member's behalf at the desk. This is the central desk workflow and it isn't built.

- [ ] **Add password reset**
  better-auth has email+password enabled with no mail provider configured. A tester who forgets their password is a dead account, and no admin can reset it either — there's no endpoint or UI. This is the single most likely support ticket in any pilot.

### Deploy configuration

- [ ] **Document and validate required env vars**
  All read with silent fallbacks — nothing fails loudly when they're missing:
  | Var | Read at | Failure mode if unset |
  |---|---|---|
  | `VITE_API_URL` | `frontend/src/lib/api.ts:1` | Frontend silently ships pointing at `http://localhost:3000` — fails in the user's browser, not at build time |
  | `BETTER_AUTH_SECRET` | not read anywhere; **absent from README** | Sessions signed with a generated secret; every restart logs everyone out |
  | `FRONTEND_URL` | `index.ts:17`, `auth.ts:10` | CORS + trusted origins fall back to localhost only |
  | `SECURE_COOKIES` | `auth.ts:19-23` | Session cookies not `SameSite=None; Secure` — cross-origin auth silently fails between the two Render domains |
  Add an `.env.example` and fail fast at boot on missing values.

- [ ] **Update the README** — `README.md:110-116`
  Still says "No admin interface" and "No role-based access control" and "No production deployment configuration" while an admin dashboard and a Render deploy pipeline both exist. Nobody but you can deploy this right now.

---

## P1 — Fix before real users, or the pilot teaches you nothing

### Data integrity

- [ ] **Separate cancellation from return** — `frontend/src/components/DashboardRentedDeviceCard.tsx:61-71`
  Cancelling a reservation POSTs the `RESERVED` item ids to `/loans/returns`, which marks them `RETURNED` and stamps `returnedAt`. Gear that was never picked up becomes indistinguishable from gear borrowed and brought back. Any "what did people actually use" analysis from the pilot is unusable. Needs a distinct `CANCELLED` status and its own endpoint. Related: `CODEAUDIT.md:32` notes the same call also sets gear `AVAILABLE` for items that were never `RENTED`.

- [ ] **Surface the real booking-failure reason** — `frontend/src/routes/checkout.tsx:51-57`
  The catch sets `submitError`, then immediately navigates to a generic "Booking Denied" page — so `setSubmitError` is dead code and the JSX at line 105 never renders. The user isn't told whether the gear was taken or the dates were invalid, and you get no signal either. Learning *why* bookings fail is most of the point of a pilot.

- [ ] **Implement `OVERDUE`**
  The enum is queried in both availability checks (`loan.service.ts:45`, `gear.service.ts:16`) but nothing ever sets it. Overdue items stay `ACTIVE` indefinitely, keep blocking availability, and flag nobody. Needs a scheduled sweep comparing `dueDate` against now.

- [ ] **Close the double-booking race** — `loan.service.ts:42-74`
  The overlap check runs *outside* the `$transaction` that follows it. Two concurrent requests for the same gear and dates can both pass the check and both commit. Low probability at pilot scale, but it silently violates the spec's core constraint (`project-spec.md:4`). Move the check inside the transaction, or add a DB-level exclusion constraint.

### Observability — you'd be flying blind

- [ ] **Add error tracking (Sentry or similar)**
  Nothing in `backend/package.json`. `errorHandler.ts:16` does `console.error` into Render's ephemeral logs. When a tester says "it broke yesterday," there's nothing to correlate.

- [ ] **Add request + structured logging** — no pino/morgan present.

- [ ] **Make `/ping` check the database** — `index.ts:30`
  Returns a static `{status:"ok"}`. A backend with a dead DB connection reports healthy and keeps taking traffic.

- [ ] **Add a frontend error boundary and a 404 route** — a render error is currently a white screen.

- [ ] **Give testers a way to report bugs** — no in-app feedback link. For a pilot this is the mechanism, not a nicety.

### Test and CI gaps

- [ ] **Add frontend tests** — zero test files under `frontend/src`. All 130 passing tests are backend. Checkout, the date picker, and the dashboard pickup/return actions — everything a tester touches — are unverified. At minimum cover the checkout submit path and `loanStatus.ts`.

- [ ] **Isolate the test database**
  `vitest.config.ts` sets no env; `lib/prisma.ts` pulls `dotenv/config` → `backend/.env`. So the auth *integration* tests (`auth.routes.test.ts` does real `deleteMany` and signup) run against whatever DB your `.env` points at — your dev DB. `.env.test` exists and nothing reads it. CI is unaffected because `deploy.yml:46` passes `DATABASE_URL` explicitly, and dotenv won't override an existing env var.

- [ ] **Run CI on PRs and `main`** — `deploy.yml:3-5` fires only on push to `staging`.

- [ ] **Add frontend lint to CI** — currently not run, and `npx eslint .` reports 14 errors / 2 warnings. Most are `react-refresh/only-export-components` noise from TanStack's file-route pattern (worth configuring away), but `gear.tsx:26` is a real `react-hooks/set-state-in-effect`.

- [ ] **Switch CI to `npm ci`** — `deploy.yml:37,71` use `npm install`, so builds aren't reproducible. Also remove the stray `backend/package-lock.json`; nested lockfiles don't belong in an npm workspace.

- [ ] **Confirm the staging database has backups.**

---

## P2 — During or after the pilot

- [ ] **Bulk gear import.** The club's real inventory has to go in one item at a time through the admin form. A CSV import or a bulk endpoint would save the setup afternoon.
- [ ] **Gear detail / info view.** `gear.tsx:85` wires the Info button to `console.log` — a dead button testers will click.
- [ ] **Gear images.** No image field in the schema; members pick equipment by name alone.
- [ ] **Wire up admin search and filters.** Rendered but `disabled` (`admin.tsx:82-95`).
- [ ] **Use or drop `GearClassification`.** `EVENT`/`NON_EVENT` is stored and settable via the admin form but no rule anywhere reads it.
- [ ] **Pickup and due-date reminders.** Depends on the same mail provider as password reset.
- [ ] **Replace `alert()` with inline errors** — `DashboardRentedDeviceCard.tsx:31,42,55,67`.
- [ ] **Hide `serialNumber` from the public gear list** — `gear.service.ts:7` returns it to unauthenticated callers.
- [ ] **Account deletion.** A tester who wants out can only be removed via psql.
- [ ] **Move `ActionButton` out of its parent** — `DashboardRentedDeviceCard.tsx:73`, remounts on every parent render (`CODEAUDIT.md:27`).
- [ ] **Document the `startDate`/`dueDate` query params on `GET /api/v1/gear`** — used by `gear.tsx:32`, undocumented in `openapi/document.ts:202-215`, against the project's own rule (`project-spec.md:21`).

---

## Appendix: how this was verified

**Confirmed by running against the local dev DB (2026-08-19):**
- `GET /api/v1/users` with no credentials → HTTP 200, 8 users with real names and email addresses.
- `GET /api/v1/users/:id/loans` with no credentials → HTTP 200, full loan history including nested gear.
- `GET /api/v1/loans/stats` with no credentials → HTTP 401 (this one *is* gated).
- `npx vitest run` → 14 files, 130 tests, all passing.
- `npx tsc --noEmit` (backend) and `tsc -b --force` (frontend) → both clean.
- `npm run build` then booting `dist/index.js` → serves `/ping` correctly.
- `npx eslint .` (frontend) → 14 errors, 2 warnings.

**Confirmed by reading code:** every item citing a `file:line`.

**Not verified:** whether better-auth includes `role` on `session.user` given the current `auth.ts` config. Flagged as the first thing to check in the RBAC item — the probe for it was not run.

**Note on scope:** this covers the pilot only. Multi-tenancy, payments, and anything beyond one camera club's inventory are out of scope by design.
