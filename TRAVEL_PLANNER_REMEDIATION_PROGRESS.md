# Travel Planner Remediation Progress

## Branch

Current branch: `fix/travel-planner-remediation`

## P1

- [ ] Canonical trip/destination model
- [ ] Remove localStorage authority for core trip data
- [ ] Standardize mutation success/failure behavior
- [ ] Fix Dashboard/Create Trip
- [ ] Fix Explore/Plan Trip
- [ ] Unify Map and Trip Workspace destinations
- [ ] Fix budget semantics
- [ ] Add trip-date validation
- [ ] Fix security-sensitive auth flows
- [ ] Fix mobile blockers
- [ ] Add regression tests

## Blocked by Backend

- **Backend Itinerary & Accommodation & Packing persistence endpoints**: The backend is hosted separately on Render and not present in this repository. Currently, `/destinations`, `/trips`, `/bookings`, `/budget`, and `/users` exist, while real server-side schema for full itinerary events, real accommodation records, and server-side packing items are absent or only supported via local storage stopgaps.
- **Backend Username Availability Endpoint**: Currently no dedicated public `/api/users/username-availability` endpoint exists; `/api/admin/users` requires admin credentials.
- **Backend Password Change Current-Password Validation**: Backend `/users/:id` update endpoint needs to enforce `current_password` authentication before allowing password changes.
- **Backend Email Verification Enforcement**: Server-side authorization tokens must be gated until email verification is confirmed in the database.

## Completed Changes

- Created and switched to working branch `fix/travel-planner-remediation`.
- Initialized remediation tracking document `TRAVEL_PLANNER_REMEDIATION_PROGRESS.md`.
- Completed Phase 0 architectural and code audit covering `api.ts`, `Dashboard.tsx`, `MapView.tsx`, `Budget.tsx`, `Explore.tsx`, `TripWorkspace.tsx`, `ProfileSettings.tsx`, and `Bookings.tsx`.

## Remaining Issues

- Tracking issues identified in `TRAVEL_PLANNER_AUDIT.md` (FUN-01 through FUN-24).
