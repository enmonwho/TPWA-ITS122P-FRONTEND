# Travel Planner Remediation Progress

## Branch

Current branch: `fix/travel-planner-remediation`

## P1

- [x] Standardize mutation success/failure behavior
- [x] Fix Dashboard/Create Trip & metrics (FUN-17 bookings count, delete & status errors)
- [x] Fix Explore/Plan Trip (preserve location, error persistence, date validation)
- [x] Unify Map and Trip Workspace destinations (canonical server store, synchronized cache)
- [x] Fix budget semantics ('Accommodation' normalization, server sync, rollback on error)
- [x] Add trip-date validation (`src/lib/dateUtils.ts` with YYYY-MM-DD parsing & range validation)
- [x] Fix security-sensitive auth flows (ForgotPassword enumeration, current_password requirement, fail-closed username check, onboarding route)
- [x] Add regression tests (35 unit tests across dateUtils, budgetUtils, usernameValidation)
- [ ] Fix mobile blockers (Trip workspace mobile itinerary / map toggle, budget table responsiveness)
- [ ] Remove localStorage authority for core trip data (itinerary & packing migration strategy pending backend)
- [ ] Canonical trip/destination model (complete full frontend unification)

## Blocked by Backend

- **Backend Itinerary & Accommodation & Packing persistence endpoints**: The backend is hosted separately on Render and not present in this repository. Currently, `/destinations`, `/trips`, `/bookings`, `/budget`, and `/users` exist, while real server-side schema for full itinerary events, real accommodation records, and server-side packing items are absent or only supported via local storage stopgaps.
- **Backend Username Availability Endpoint**: Currently no dedicated public `/api/users/username-availability` endpoint exists; `/api/admin/users` requires admin credentials.
- **Backend Password Change Current-Password Validation**: Backend `/users/:id` update endpoint needs to enforce `current_password` authentication before allowing password changes.
- **Backend Email Verification Enforcement**: Server-side authorization tokens must be gated until email verification is confirmed in the database.

## Completed Changes

1. **Git Setup**:
   - Confirmed clean tree and active branch `fix/travel-planner-remediation`.
2. **Phase 2 — Fix False-Success Mutations**:
   - `Dashboard.tsx`: Fixed trip deletion and status toggling to only update state upon confirmed server response; surfaces `deleteError` and `statusError` in visible alerts; fixed metric FUN-17 by querying real bookings count via `bookingsApi.getAll()`.
   - `MapView.tsx`: Eliminated synthetic `id: Date.now()` IDs on search/manual destination creation; only prunes destination on confirmed server deletion; retains user inputs and surfaces visible error banner on failure.
   - `Budget.tsx`: Fixed optimistic mutations in Add Balance, Add Expense, and Delete Expense; rolls back state and displays errors on server failure; pruned trip storage centrally upon confirmed deletion.
3. **Phase 6 & 7 — Fix Budget Semantics & Date Validation**:
   - Added `src/lib/dateUtils.ts` for strict `YYYY-MM-DD` date parsing, comparison, duration, and conflict validation without UTC timezone drift. Added 14 unit tests in `src/lib/dateUtils.test.ts`.
   - Added `src/lib/budgetUtils.ts` for canonical category normalization, fixing the legacy `'Accomodation'` spelling mismatch, and calculating expenses and balances. Added 11 unit tests in `src/lib/budgetUtils.test.ts`.
   - Updated `src/index.css` with `.cat-accommodation` styles.
4. **Phase 3 & 4 — Fix Explore → Plan Trip & Unify Destinations**:
   - `Explore.tsx`: Preserves selected location, country, coordinates, and travel type; calls `destinationsApi.create` upon trip creation; seeds workspace destination cache; retains dialog and user input with error banner on failure.
   - `TripWorkspace.tsx`: Integrated with canonical `destinationsApi` store; fetches and reconciles server destinations on mount; assigns stable server IDs; synchronizes destination additions and deletions with backend and shared cache.
   - `MapView.tsx`: Synchronizes destination additions and deletions to `lakbye_workspace_dests_${activeTrip.id}` in lockstep.
5. **Phase 8 — Fix Security-Sensitive Frontend Flows**:
   - `ForgotPassword.tsx`: Replaced distinct account found/not found cards with uniform neutral message to eliminate account enumeration; gated `devResetUrl` behind `import.meta.env.DEV`.
   - `ProfileSettings.tsx`: Included `current_password` in payload when updating password; halted with visible error banner on `userApi.updateProfile` failure instead of swallowing error.
   - `usernameValidation.ts` & `Onboarding.tsx`: Eliminated fail-open behavior on network/403 errors (returning `status: 'unknown'`); routed completed onboarding to `ROUTES.DASHBOARD` instead of `ROUTES.HOME`. Added 10 unit tests in `src/lib/usernameValidation.test.ts`.

## Regression Testing Summary

- Test framework: `vitest` v5.0.3 installed and configured (`npm test`).
- Test results: **3 passed files, 35 passed tests, 0 failures**.
- TypeScript type checking: `npx tsc --noEmit` **0 errors**.

## Commits on `fix/travel-planner-remediation`

1. `f895e8c` - `docs: initialize travel planner remediation checklist`
2. `4acb3b8` - `fix: prevent false success on trip and map mutations`
3. `0cf67fb` - `fix: reconcile budget state, mutations and category spellings`
4. `b998355` - `fix: preserve explore destination and unify workspace map destinations`
5. `af6e64a` - `fix: harden security flows, password change and username availability`
