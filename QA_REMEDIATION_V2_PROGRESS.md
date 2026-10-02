# QA Remediation V2 Progress

Branch: `fix/qa-remediation-v2`

Base: local stable `main` (`94bfa56`)

Updated: 2026-10-02

## Scope Guardrails

- [x] Did not merge or cherry-pick `fix/travel-planner-remediation`.
- [x] Did not modify Landing, Sign Up, Staff, or Admin pages.
- [x] Kept the existing layout and color system unchanged.
- [x] Limited changes to QA logic, persistence, shared formatting, validation, and tests.
- [x] Preserved the pre-existing uncommitted `.gitignore` edit without staging it.

## Completed Fixes

- [x] Canonical country IDs are used by country selection, trip extras, and workspace destinations.
- [x] `Korea, South`, `South Korea`, and `Republic of Korea` resolve to the same `south-korea` ID and display as `South Korea`.
- [x] Cities remain destinations under their canonical country; selecting Seoul cannot create a duplicate Korea route entry.
- [x] Add Country uses canonical autocomplete results and rejects unsupported free-text countries.
- [x] Country route entries persist an explicit `order` and itinerary grouping/day scheduling use that order.
- [x] Route order survives refresh, destination additions, destination deletions, country deletion, and trip settings edits.
- [x] Legacy country-name storage migrates into the canonical ordered route and the obsolete key is removed.
- [x] One shared date formatter applies user preferences to Dashboard, Trip Workspace, Trip Settings, My Bookings, trip/booking cards, Map, Packing, Budget, public trip cards, and itinerary export.
- [x] API and date-input values remain `YYYY-MM-DD`.
- [x] Currency parsing, input step/minimum, and display precision follow minor-unit rules; JPY accepts whole numbers while PHP/USD accept two decimals.
- [x] Budget amounts are sanitized before chart/display calculations.
- [x] Budget percentages safely handle zero, 50%, 100%, over-budget, NaN, infinity, and invalid denominators.

## Regression Tests

- Country alias normalization and unsupported free text.
- Canonical autocomplete matching (`Jap` -> `Japan`).
- Seoul remains under the existing South Korea route entry.
- Multi-country route ordering independent of response order.
- Persisted ordering after JSON refresh and destination deletion.
- All supported date preferences, ranges, ISO preservation, and invalid dates.
- JPY integer/minor-unit validation.
- PHP and USD two-decimal validation.
- Budget percentage edge cases and invalid numeric inputs.

## Verification

- `npm test`: 4 test files passed, 28 tests passed.
- `npm run lint`: completed with 0 errors and 49 existing warnings.
- `npm run build`: passed; Vite reported only its existing large-chunk advisory.
- Forbidden-page diff check: no Landing, Sign Up, Staff, or Admin files changed from `main`.

## Commits

- `c763dfa` - `fix: normalize countries and persist route order`
- `82c14e4` - `fix: apply shared user date formatting`
- `341aad1` - `fix: validate currency units and budget math`
- `e83d43d` - `test: cover autocomplete and route persistence`

## Remaining Issues

- No open issues remain in the requested QA logic scope.
- The repository still has 49 non-blocking lint warnings outside this remediation scope.
- The supplied QA PDF was recovered as a standalone artifact without merging the excluded branch, but the available local PDF viewers/extractors could not render it in this session. The implementation was verified against the complete QA criteria supplied in the task.

---

## Prompt 2 - Customer Flow QA Fixes

### Issue / Status

- [x] Traveler search debounces requests, cancels/ignores stale responses, clears old results immediately, and removes duplicate usernames.
- [x] Traveler results use a viewport-aware portal so the panel is not clipped; the search control is available from the authenticated mobile navigation.
- [x] Search results route to a standalone canonical `/profile/:username` page. The legacy `/:username` route redirects there instead of mounting the Dashboard layout.
- [x] Public profiles expose only the safe public-profile fields and trips explicitly marked `public`; owner-only controls and private-workspace navigation were removed.
- [x] Dashboard trip actions render through a fixed portal, remain inside the viewport, and flip above the trigger when space below is insufficient.
- [x] Create Trip calendars render above the modal without resizing it, remain viewport-bound, and close on outside click or Escape.
- [x] Dashboard empty states are width-contained and centered; calendar navigation is separated from month/day content.
- [x] My Bookings clears stale trip selections after search changes, derives type/status counts from displayed records, distinguishes pending/confirmed/processed/used/completed states, and shows filter-specific empty states.
- [x] Book Activity / Stay locks body scrolling, supports Escape/backdrop/Cancel dismissal when safe, preserves unrelated tab data, prevents repeated submission, and shows the shared preferred-date rendering while retaining ISO date input values.
- [x] Packing status/scope controls have stable dimensions, update immediately, and derive both filters and Add Item scopes from the trip's canonical country route.
- [x] Packing Add Item requires a name, normalizes quantity to a positive integer, rejects non-trip scopes, prevents repeated submission, persists items, and keeps quick suggestions.
- [x] Cover photo updates report success only after the API returns a persisted reference; failed uploads retain the previous visible cover and report an error.
- [x] Feedback modal supports close button, Cancel, Escape, safe backdrop dismissal, body scroll locking without scrollbar jump, and narrow-height scrolling without Landing-page styling changes.

### Files Modified

- `src/components/AnchoredPopover.tsx`
- `src/components/CreateTripModal.tsx`
- `src/components/DateRangePicker.tsx`
- `src/components/FeedbackModal.tsx`
- `src/components/Header.tsx`
- `src/hooks/useModalBehavior.ts`
- `src/index.css`
- `src/lib/bookingFilters.ts`
- `src/lib/coverPhoto.ts`
- `src/lib/dashboardMenu.ts`
- `src/lib/modal.ts`
- `src/lib/packing.ts`
- `src/lib/popover.ts`
- `src/lib/publicProfile.ts`
- `src/lib/travelerSearch.ts`
- `src/pages/Bookings.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/PublicProfile.tsx`
- `src/pages/Settings.tsx`
- `src/pages/TripPacking.tsx`
- `src/router.tsx`
- `src/services/api.ts`
- Regression test files listed below.

### Tests Added

- `src/lib/bookingFilters.test.ts` - status aliases, filters, and displayed-data counts.
- `src/lib/coverPhoto.test.ts` - persisted cover-reference validation.
- `src/lib/dashboardMenu.test.ts` - trip-action menu open/toggle state.
- `src/lib/modal.test.ts` - modal dismissal and in-progress-operation guards.
- `src/lib/packing.test.ts` - canonical scopes, status/scope filtering, and quantity validation.
- `src/lib/popover.test.ts` - viewport clamping and above-trigger positioning.
- `src/lib/publicProfile.test.ts` - explicit-public-only trip exposure and private-field removal.
- `src/lib/travelerSearch.test.ts` - duplicate prevention, stale request guards, and canonical public-profile paths.

### Verification

- `npm test`: passed - 12 test files, 44 tests.
- `npm run lint`: passed with 0 errors and 43 non-blocking warnings (including pre-existing warnings in untouched Staff/Admin files).
- `npm run build`: passed; Vite reported only its large-chunk advisory.
- TypeScript production compilation passed as part of `npm run build`.
- Protected-page diff check: Landing, Sign Up, Staff, and Admin page files were not modified. Only `FeedbackModal.tsx` received the explicitly permitted behavior-only changes.
- Prompt 1 canonical country/date/currency/route-order/budget logic and its regression tests remain intact; the full suite passes.

### Commits

- `b8d25a1` - `fix: stabilize traveler search and public profiles`
- `9441c38` - `fix: correct dashboard popovers and calendar flow`
- `0915c48` - `fix: repair booking filters and modal behavior`
- `e555463` - `fix: stabilize packing filters and item flow`
- `c1b2aab` - `fix: persist trip cover uploads transactionally`
- `b2bea12` - `fix: harden feedback modal behavior`

### Notes / Blockers

- An attached in-app browser session was not available (`agent.browsers.list()` returned an empty list), so interactive visual checks at 1920x1080, 1440x900, 1024x768, 768px, and 375px could not be executed in this session. Viewport behavior is covered by the shared positioning tests and normal responsive CSS; no physical-resolution, DPR, zoom, or transform-scaling hacks were added.
- Cover persistence uses the existing backend `cover_photo` update contract. If that deployed endpoint rejects the image payload or omits a persisted reference, the UI now correctly reports failure instead of presenting local-only state as a successful upload.
- The pre-existing uncommitted `.gitignore` edit remains unstaged and unchanged.
