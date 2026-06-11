# Add New Gear — Design Spec

**Date:** 2026-06-11
**Figma source:** https://www.figma.com/design/m7tgNOtRevmHBdSc7KWqDY/Personal-projects?node-id=1096-860
**Status:** Approved

## Goal

Implement the "Add New Gear" form from Figma as a focused admin-facing screen at `/admin/gear/new`. The form must persist to the existing `Gear` table, extending the schema with a new `classification` enum field (Event vs. Non-Event Gear).

## Scope

- New backend field `Gear.classification` (`GearClassification` enum: `EVENT`, `NON_EVENT`) — required, default `EVENT` for backfilled rows.
- Extended `CreateGearSchema` accepts `classification`.
- `GearService.createGear` accepts `classification` and converts Prisma's P2002 duplicate-serial error into the existing `ConflictError`.
- New frontend route `/admin/gear/new` with the form.
- Category dropdown sourced from distinct `category` values on existing gear, plus an "Add new category…" option that reveals a text input.
- On successful submit → `navigate({ to: '/admin' })`.

## Non-Goals (deferred follow-ups)

- Admin-only access gating (any logged-in user can reach the form for now — same policy as the admin dashboard)
- Hero image + "NEW INVENTORY" badge from the Figma mockup
- Success toast / banner on the destination page
- Dedicated `GET /api/v1/gear/categories` endpoint
- Confirm-discard dialog on the X close button
- Field-level live validation (we validate on submit only)
- Editing or deleting existing gear

## Backend Changes

### Prisma schema + migration

In `backend/prisma/schema.prisma`:

1. Add a new enum below the existing `GearStatus` enum:
   ```prisma
   enum GearClassification {
     EVENT
     NON_EVENT
   }
   ```
2. Add a column to the `Gear` model:
   ```prisma
   classification GearClassification @default(EVENT)
   ```

The `@default(EVENT)` lets Prisma backfill existing rows when the migration runs without prompting for a manual default.

Generate a new migration: `npx prisma migrate dev --name add_gear_classification --schema backend/prisma/schema.prisma`. The migration also regenerates the Prisma client at `backend/src/generated/prisma/`.

### Shared schemas

In `shared/src/index.ts`:

1. Add the enum (const-object style matching existing `Role`, `GearStatus`, `ItemStatus`):
   ```ts
   export const GearClassification = {
     EVENT: "EVENT",
     NON_EVENT: "NON_EVENT",
   } as const;
   export type GearClassification = (typeof GearClassification)[keyof typeof GearClassification];
   ```
2. Extend `CreateGearSchema`:
   ```ts
   export const CreateGearSchema = z.object({
     name: z.string().min(1),
     serialNumber: z.string().min(1),
     category: z.string().min(1),
     classification: z.enum([GearClassification.EVENT, GearClassification.NON_EVENT]),
   });
   ```

`CreateGearInput` automatically picks up the new field via `z.infer`.

### Service + controller

`backend/src/gear/gear.service.ts`:

```ts
async createGear(data: CreateGearInput): Promise<Gear> {
  try {
    return await prisma.gear.create({ data });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ConflictError(`Gear with serialNumber ${data.serialNumber} already exists`);
    }
    throw err;
  }
}
```

Add the `Prisma` import from `../generated/prisma/client` and `ConflictError` from `../errors/AppError`. Matches the pattern already used in `UserService.createUser`.

No controller change needed — `GearController.createGear` already passes `req.body` through validation middleware.

### OpenAPI

`backend/src/openapi/document.ts`:
- Update `GearResponseSchema` to include `classification: z.enum(["EVENT", "NON_EVENT"])`.
- The `CreateGearSchema` reference for `POST /api/v1/gear` already pulls from the schema file — no path change needed beyond updating the body example, optionally.
- Add a `409` response to the `POST /api/v1/gear` registration so the new ConflictError is documented.

### Seed

`backend/prisma/seed.ts`: every seed gear should include `classification: 'EVENT'` (or `'NON_EVENT'` for one or two so dev data exercises both). The migration's `@default(EVENT)` covers existing dev rows automatically; the seed change keeps regenerated seeds explicit.

### Tests (TDD)

`backend/src/gear/gear.service.test.ts`:
- New test: `createGear` passes `classification` through to `prisma.gear.create`.
- New test: `createGear` converts a P2002 error into `ConflictError`.
- Update the existing happy-path test fixture to include the new field.

`backend/src/gear/gear.routes.test.ts`:
- New test: `POST /gear` returns `400` when `classification` is missing or invalid.
- New test: `POST /gear` returns `409` on duplicate serial number (mock `prisma.gear.create` to reject with a `P2002`).
- Update the existing happy-path test body to include `classification: "EVENT"`.

### Changelog

Append to the `## [Unreleased] > ### Added` block in `backend/changelog.md`:

- `GearClassification` enum (`EVENT`, `NON_EVENT`) and `Gear.classification` column added with `@default(EVENT)` migration.
- `CreateGearSchema` now requires `classification` (shared package).
- `GearService.createGear` now translates P2002 duplicate-serial errors into `ConflictError` (`409`).
- OpenAPI: `Gear` schema gains `classification`; `POST /api/v1/gear` documents the new `409` response.

## Frontend Changes

### Route

- New file: `frontend/src/routes/admin.gear.new.tsx` + `admin.gear.new.module.css`
- TanStack Router will register the path `/admin/gear/new` from the dotted filename.

### Data

On mount:
- `GET /api/v1/gear` → reduce response into `categoryOptions: string[]` (unique, sorted by `localeCompare`).
- Loading and error states render in-place.

### Form state

Local `useState` for each field. No form library.

```ts
const [name, setName] = useState("");
const [serial, setSerial] = useState("");
const [category, setCategory] = useState<string>("");     // "" = no selection, "__new__" sentinel triggers the custom input
const [newCategory, setNewCategory] = useState("");
const [classification, setClassification] = useState<GearClassification>("EVENT");
const [errors, setErrors] = useState<Partial<Record<"name" | "serial" | "category" | "form", string>>>({});
const [submitting, setSubmitting] = useState(false);
```

The "Add new category…" option uses the literal sentinel `"__new__"` in the `<select>`. When that's the selected value, render a labeled text input below the select and use `newCategory` as the category payload on submit.

### Validation (on submit)

- `name.trim().length > 0`, else `errors.name = "Required"`.
- `serial.trim().length > 0`, else `errors.serial = "Required"`.
- If `category === ""` → `errors.category = "Pick a category"`.
- If `category === "__new__"` and `newCategory.trim().length === 0` → `errors.category = "Enter the new category name"`.
- `classification` always defaults to `EVENT` so it's never blank.

If `errors` has any keys, abort the submit and render errors inline.

### Submit

```ts
const payload = {
  name: name.trim(),
  serialNumber: serial.trim(),
  category: (category === "__new__" ? newCategory : category).trim(),
  classification,
};
try {
  setSubmitting(true);
  await api.post("/api/v1/gear", payload);
  navigate({ to: "/admin" });
} catch (err) {
  if (err instanceof ApiError && err.status === 409) {
    setErrors({ serial: "Serial number already in use" });
  } else {
    setErrors({ form: "Could not add gear. Please try again." });
  }
} finally {
  setSubmitting(false);
}
```

### Layout

Top to bottom (matches Figma without the hero image):

1. **Top app bar** — left back arrow `←` → `navigate({ to: '/admin' })`, then the title "Add New Gear" (left-aligned next to the arrow, matching Figma), right close `×` → `navigate({ to: '/admin' })`. White background, 64px tall, subtle border-bottom.
2. **Form** — max-width 448px, padded 24px, gap 24px between fields:
   - Device Name — uppercase 12px label `#434656`, 48px white input with `rgba(195,197,217,0.3)` border, placeholder "e.g. Cinema Rig 01"
   - Serial Number — same treatment, placeholder "SN-8829-XJ"
   - Category — same input style but a `<select>` with chevron; options: each unique existing category + a sentinel "+ Add new category…". When the sentinel is chosen, a text input "New category name" appears beneath.
   - Gear Classification — 2-column grid of radio cards (each 56px tall, rounded 8px). Selected card: tinted `rgba(126, 198, 0, 0.05)` background, `#7ec600` border, small green check pinned top-right. Unselected: white card, `rgba(195,197,217,0.3)` border.
3. **Form-level error banner** — if `errors.form` is set, render above the submit button.
4. **Submit button** — full-width 56px, `#7ec600`, white "ADD ITEM" text + `+` icon, soft green shadow. Disabled (greyed, `cursor: not-allowed`) while `submitting`.

### Styling tokens

- Page bg: `#fdfdf6`
- Input bg: `#ffffff`
- Input border: `rgba(195, 197, 217, 0.3)`
- Label text: `#434656`
- Value text: `#171c1f`
- Primary: `#7ec600`
- Selected card bg: `rgba(126, 198, 0, 0.05)`
- Error text: `#ba1a1a`

### Manual verification

1. Start `dev:backend` and the frontend dev server.
2. Log in.
3. From `/admin`, click the "ADD New item" button (or visit `/admin/gear/new` directly).
4. Confirm the form renders with empty inputs, Category placeholder selected, "Event Gear" radio pre-selected.
5. Submit with all blanks → all required errors render inline.
6. Pick "Add new category…" → confirm the text input appears; type "Drone".
7. Fill name + serial + classification, submit → confirm redirect to `/admin` and the new gear appears in the user list endpoint.
8. Submit again with the same serial → confirm the inline "Serial number already in use" error renders on the Serial Number field.
9. Visit `/admin/gear/new` while logged out → confirm "Please log in" affordance (same pattern as admin dashboard).

## File List

**Backend — modified**
- `backend/prisma/schema.prisma` — add `GearClassification` enum + `Gear.classification` column
- `backend/prisma/migrations/<new>/migration.sql` — auto-generated
- `backend/prisma/seed.ts` — include `classification` on seed gear
- `backend/src/gear/gear.service.ts` — accept new field, add P2002 handler
- `backend/src/gear/gear.service.test.ts` — extend tests
- `backend/src/gear/gear.routes.test.ts` — extend tests
- `backend/src/openapi/document.ts` — extend `Gear` schema, add 409 response on POST
- `backend/changelog.md` — entry

**Shared — modified**
- `shared/src/index.ts` — `GearClassification` enum + extended `CreateGearSchema`

**Frontend — created**
- `frontend/src/routes/admin.gear.new.tsx`
- `frontend/src/routes/admin.gear.new.module.css`

**Frontend — modified**
- `frontend/src/routes/admin.tsx` — wire the existing "ADD New item" CTA to `navigate({ to: '/admin/gear/new' })` (currently a no-op)

`ApiError` is already exported from `frontend/src/lib/api.ts:3`, so no change is needed there — the form imports it directly.

## Risks & Trade-offs

- **Required new column on existing rows.** The `@default(EVENT)` makes the migration safe in dev, but if there's any real data, all of it becomes "Event Gear" until someone fixes individual records. The user has accepted this.
- **No admin gating.** Any logged-in user can create gear. Tracked as a follow-up alongside the admin-dashboard gating.
- **Category list cardinality.** Deriving from existing gear requires a `GET /api/v1/gear` round-trip on every form mount. Acceptable at this scale.
- **No optimistic UI / no success toast.** A successful submit instantly navigates away with no confirmation, so the only signal is the URL change. Tracked as a follow-up.
- **The `__new__` sentinel** could collide with a legitimate category named `__new__`. Acceptable in practice; can switch to a discriminated union later if it becomes an issue.
