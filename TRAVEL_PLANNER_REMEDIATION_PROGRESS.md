# Travel Planner Remediation Progress

## Branch

Current branch: `fix/travel-planner-remediation`

## Priority 1 — Logic Bugs Status

- [x] **Country/destination inconsistency**:
  - `South Korea`, `Korea, South`, etc. resolve to canonical "South Korea".
  - Adding "Seoul" maps to South Korea and nests as a destination under the parent country rather than creating duplicate pseudo-countries.
  - Replaced uncontrolled free-text with `CountryAutocomplete` featuring canonical dropdown suggestions, pill quick-selection, and alias resolution.
  - Stable ISO country codes/IDs assigned internally via `src/lib/countryUtils.ts`.
- [x] **Multi-country itinerary order**:
  - Reorder controls (Move Up / Move Down) added to multi-country sections.
  - Destination country sequence persists explicitly in local and workspace storage instead of depending on arbitrary API return order.
- [x] **Date preference**:
  - User's selected date format preference (`MM/DD/YYYY`, `DD/MM/YYYY`, `YYYY-MM-DD`, etc.) applied consistently across Dashboard, Trip Settings, Bookings, Itinerary, and Staff Dashboard tables.
  - Internal storage strictly preserves ISO `YYYY-MM-DD` timestamps.
- [x] **Currency validation**:
  - Zero-decimal currencies (e.g., JPY, KRW, VND, HUF, TWD) accept valid integer amounts with `step="1"` and `min="1"`.
  - Standard decimal currencies enforce 2 decimal places with `step="0.01"`.
  - Input rejection and inline validation prevent invalid decimal fractions on zero-decimal currencies.
- [x] **Staff Dashboard columns**:
  - `Scheduled Date & Time`: mapped to booked activity date/time (`booking_date`), never falling back to creation time.
  - `Submitted At`: mapped to request creation time (`created_at`).
  - `Processed At`: mapped to approval/rejection timestamp (`processed_at` / `updated_at`).
  - Distinct sorting and modal details respect the decoupled timestamps.

## Priority 2 — UX & Responsive Status

- [x] **Landing page small screen fit**:
  - Fixed horizontal scroll and viewport overflow on screens <=600px and 375px with `overflow-x: hidden` and width clamps on `.earth-home-page`.
- [x] **Feedback/ratings crowding**:
  - Redesigned testimonials grid and cards: breathable padding, refined typography (1.05rem title, 0.925rem body with 1.6 line height), light border, and soft modern shadows.
- [x] **Sign Up UX**:
  - Added visible input focus-within outlines and rings.
  - Added `Confirm Password` field with visibility toggle and mismatch validation.
  - Added `*` required-field indicators.
- [x] **Find Travelers search & Public Profile preview**:
  - Added Traveler Profile preview modal upon search selection before full profile navigation.
  - Supported mobile header traveler search.
- [x] **Feedback modal visual layout**:
  - Responsive padding, `maxHeight: 90vh`, and scroll container preventing cutoff on mobile viewports; canonical country normalization on submission.
- [x] **Dashboard improvements**:
  - Increased widget/stat card subtitle font size for readability.
  - Added `placement-up` and viewport width clamping to trip options dropdown menus so they stay inside viewport bounds.
  - Centered empty state messages with consistent flex pattern.
  - Fixed DateRangePicker navigation header to prevent arrows overlapping dates.
  - Added trip cover photo thumbnail preview in dashboard table rows.
- [x] **Route Planner layout**:
  - Reduced map dominance (`.map-globe-view-panel` width 38% / max-width 440px), keeping itinerary visually primary.
- [x] **Sidebar logo visibility**:
  - Replaced white logo with colored `lakbye-logo.png` in `TripWorkspaceLayout.tsx` for crisp visibility on light sidebar backgrounds.
- [x] **Budget tracker circle glitch**:
  - Explicit dimensions (`210x210`) on Recharts container in `Budget.tsx` and `TripPacking.tsx` preventing initial render jump.
- [x] **Packing filter button shift**:
  - Stabilized width (`86px` status, `112px` scope) on packing filter buttons.
- [x] **Consistent centered empty states**:
  - Standardized `.dashboard-empty-state`, `.bookings-table-empty`, `.budget-table-empty`, and `.staff-empty-state`.

## Blocked by Backend

- **Backend Itinerary & Accommodation & Packing persistence endpoints**: The backend is hosted separately on Render and not present in this repository. Currently, `/destinations`, `/trips`, `/bookings`, `/budget`, and `/users` exist, while real server-side schema for full itinerary events, real accommodation records, and server-side packing items are absent or only supported via local storage stopgaps.
- **Backend Username Availability Endpoint**: Currently no dedicated public `/api/users/username-availability` endpoint exists; `/api/admin/users` requires admin credentials.
- **Backend Password Change Current-Password Validation**: Backend `/users/:id` update endpoint needs to enforce `current_password` authentication before allowing password changes.
- **Backend Email Verification Enforcement**: Server-side authorization tokens must be gated until email verification is confirmed in the database.

## Regression Testing Summary

- Test framework: `vitest` v5.0.3 (`npm test -- --run`).
- Test results: **7 passed files, 63 passed tests, 0 failures**.
  - `src/lib/countryUtils.test.ts` (12 tests passed)
  - `src/lib/currency.test.ts` (5 tests passed)
  - `src/lib/staffBookingMapping.test.ts` (4 tests passed)
  - `src/lib/signUpValidation.test.ts` (3 tests passed)
  - `src/lib/budgetUtils.test.ts` (15 tests passed)
  - `src/lib/dateUtils.test.ts` (14 tests passed)
  - `src/lib/usernameValidation.test.ts` (10 tests passed)
- TypeScript type checking & production build: `npm run build` (`tsc -b && vite build`) **0 errors**, completed cleanly in 7.04s.

## Commits on `fix/travel-planner-remediation`

1. `f895e8c` - `docs: initialize travel planner remediation checklist`
2. `4acb3b8` - `fix: prevent false success on trip and map mutations`
3. `0cf67fb` - `fix: reconcile budget state, mutations and category spellings`
4. `b998355` - `fix: preserve explore destination and unify workspace map destinations`
5. `af6e64a` - `fix: harden security flows, password change and username availability`
6. `241f2e3` - `docs: update remediation checklist with completed P1 fixes`
7. `667f889` - `fix: adjust deleteExpenseError reset value to empty string`
8. `0d9a985` - `fix: repair mobile workspace layout, mobile map access and budget table wrapping`
9. `928412a` - `docs: check off mobile blockers in remediation progress`
10. `e9b1636` - `fix: normalize category comparison for accommodation in bookings`
11. `0c2d82b` - `fix: normalize countries with canonical aliases and preserve itinerary country ordering`
12. `bd66e1f` - `fix: validate integer amounts for zero-decimal currencies, propagate user date format, and handle budget edge cases`
13. `29a3813` - `fix: decouple and accurately map staff dashboard scheduled, submitted, and processed timestamps`
14. `2f26ec2` - `fix: enhance signup validation with confirm password, traveler profile modal preview, and stabilize packing filters`
15. `b1808d6` - `fix: refine dashboard responsive layouts, route planner map proportion, and centered empty states`
