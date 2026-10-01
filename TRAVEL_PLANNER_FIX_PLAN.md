# Travel Planner Remediation Plan

## Objective

Fix the travel planner's core architectural, persistence, logic, UX, responsive, and security issues before adding major new features.

This plan is based directly on the current audit findings.

The goal is to make the existing product reliable first, then improve the itinerary experience, then add higher-level travel-planning features.

---

# Core Principle

The current application already has many features.

The main problem is that those features do not operate on one authoritative trip model.

The remediation should therefore follow this order:

1. Unify trip-related data.
2. Fix persistence and sync behavior.
3. Fix core planning logic.
4. Connect bookings, transport, accommodation, and budget.
5. Fix security-sensitive flows.
6. Fix mobile/responsive/accessibility problems.
7. Add automated tests.
8. Only then add advanced features.

Do not begin with visual redesigns or optional features.

---

# Phase 1 — Create One Canonical Trip Model

## Problem

Trip-related information is currently split between the backend/API, `localStorage`, temporary frontend state, Map destination data, local itinerary destination data, packing data, and journal/preference data.

## Required Fix

Define one canonical server-side trip structure:

```text
Trip
├── Destinations
├── ItineraryEvents
├── TransportEvents
├── Accommodations
├── Bookings
├── Expenses
├── Budget
├── PackingItems
├── JournalEntries
└── Preferences
```

Every related record must reference the same `trip_id`.

Use server-issued IDs for persisted records. Do not use values such as `Date.now()` or `dest-custom-*` as permanent IDs.

### Recommended Trip Fields

```text
id
user_id
title
start_date
end_date
status
cover_image
travel_type
created_at
updated_at
```

### Recommended Destination Fields

```text
id
trip_id
place_id
name
country
latitude
longitude
start_date
end_date
order
created_at
updated_at
```

Normalize location names and prefer canonical location IDs.

### Completion Criteria

- Map and Trip Workspace use the same destinations.
- Destinations persist across devices.
- Local storage is no longer authoritative for core trip data.
- Trip deletion cleans up related records safely.
- Trip duplication has a clearly defined scope.

---

# Phase 2 — Fix Save, Update, Delete, and Sync Behavior

## Problem

Several screens update the UI even when the backend request fails.

## Required Mutation Pattern

```text
User Action
→ Pending State
→ API Request
→ Confirmed Server Response
→ UI Update
```

On failure:

```text
Failure
→ Preserve Previous State
→ Show Error
→ Allow Retry
```

Standardize these UI states:

```text
Saving...
Saved
Sync failed
Retry
Loading...
Unable to load
No data yet
Using cached data
Stored on this device only
```

Do not convert API failures into `[]`, `null`, or fake success unless that is the true result.

## Optimistic Updates

If optimistic UI is kept:

```text
OLD STATE
→ optimistic change
→ API request

SUCCESS:
keep new state

FAILURE:
restore OLD STATE
show retry message
```

### Completion Criteria

- Failed deletes do not disappear permanently from the UI.
- Failed creates do not create fake persisted records.
- Failed updates restore previous values.
- Refreshing matches server data.

---

# Phase 3 — Repair Core Trip Creation

## Dashboard Create Trip

Use:

```text
Create Trip Form
→ Validate Fields
→ POST Trip
→ Receive Server Trip ID
→ Create Initial Destination(s)
→ Confirm Success
→ Open Trip Workspace
```

Do not store critical trip fields only in `localStorage`.

## Explore → Plan Trip

Fix the selected destination loss.

Required flow:

```text
Explore
→ Select Destination
→ Plan Trip
→ Create Trip
→ Create Selected Destination
→ Open Trip Workspace
```

Do not navigate after an API failure.

## Onboarding

Improve:

```text
Verification
→ Onboarding
→ Dashboard
→ Create Your First Trip
```

instead of returning the user to the landing page.

---

# Phase 4 — Replace the Current Itinerary Structure

## Problem

The itinerary currently lacks real scheduled events with date/time semantics.

## Required Model

Create `ItineraryEvent`.

Recommended fields:

```text
id
trip_id
destination_id
type
title
description
date
start_time
end_time
latitude
longitude
booking_id
transport_id
accommodation_id
order
notes
created_at
updated_at
```

Event types may include:

```text
activity
transport
accommodation
meal
reservation
custom
```

## Required Validation

Warn when:

```text
event.start_time < previous_event.end_time
```

or:

```text
event.date outside trip dates
```

or:

```text
destination dates outside trip dates
```

Warn the user rather than silently changing the plan.

---

# Phase 5 — Add Trip Date Impact Validation

When trip dates change:

```text
User changes trip dates
→ System checks dependent records
→ Detect conflicts
→ Show impact review
→ User resolves/accepts
→ Save transaction
```

Check:

- destinations
- bookings
- accommodations
- itinerary events
- transport events

Treat values such as `2026-11-04` as calendar dates, not generic timestamps.

Use one shared date-only utility across the app.

---

# Phase 6 — Connect Bookings to the Itinerary

Recommended booking fields:

```text
id
trip_id
destination_id
itinerary_event_id
booking_type
provider
reference_number
start_date
end_date
start_time
end_time
amount
currency
status
notes
```

Booking types:

```text
flight
hotel
activity
restaurant
transport
other
```

Bookings should appear in:

- itinerary timeline
- trip overview
- calendar
- budget/expense view

Avoid duplicate entry.

---

# Phase 7 — Create Real Accommodation Records

Remove fabricated accommodation information.

Recommended model:

```text
id
trip_id
destination_id
name
address
latitude
longitude
check_in
check_out
booking_id
cost
currency
status
```

Validate:

```text
check_in < check_out
```

and normally:

```text
trip_start <= check_in
check_out <= trip_end
```

Never show fake hotel/stay details if no accommodation record exists.

---

# Phase 8 — Create a Transport Event Model

Recommended fields:

```text
id
trip_id
origin_destination_id
destination_destination_id
mode
provider
reference_number
departure_date
departure_time
departure_timezone
arrival_date
arrival_time
arrival_timezone
cost
currency
status
```

Possible modes:

```text
flight
train
bus
car
ferry
walk
other
```

Transport should appear directly in the itinerary.

---

# Phase 9 — Fix Budget Architecture

Define these separately:

```text
planned_budget
funded_amount
spent_amount
remaining_amount
```

Formula:

```text
remaining_amount = funded_amount - spent_amount
```

Optionally:

```text
budget_remaining = planned_budget - spent_amount
```

Do not use the same label for both.

## Expense Model

Recommended fields:

```text
id
trip_id
destination_id
itinerary_event_id
category_id
description
original_amount
original_currency
base_amount
base_currency
exchange_rate
exchange_rate_date
created_at
```

Use stable category IDs:

```text
accommodation
food
transport
activity
shopping
other
```

Do not use display labels as business identifiers.

Fix `Accomodation` to `Accommodation`.

---

# Phase 10 — Preserve Currency Audit Data

Store:

```text
original_amount
original_currency
exchange_rate
base_amount
base_currency
exchange_rate_date
```

Do not discard the original transaction currency after conversion.

---

# Phase 11 — Unify Map and Location Data

Trip Workspace and Map must use the same destination dataset.

```text
Trip Destination API
        ↓
   Shared State
    ↙      ↘
Planner    Map
```

For selected locations store:

```text
canonical_place_id
display_name
country
latitude
longitude
source
```

Do not substitute fake coordinates or metadata when data is unavailable.

---

# Phase 12 — Remove Fabricated Travel Data

Never fabricate factual-looking fallback values for:

- population
- currency
- languages
- city
- travel costs
- attractions
- accommodation
- country facts

Use:

```text
Not available
Unable to load
Data unavailable
```

or clearly labeled demo/sample data.

---

# Phase 13 — Sync Packing Lists to the Account

Recommended fields:

```text
id
trip_id
name
category
quantity
is_packed
created_at
updated_at
```

Packing should survive refresh, logout, browser changes, and device changes.

---

# Phase 14 — Fix Journal Persistence

Use explicit states:

```text
draft
saving
published
failed
```

Do not show an entry as published before the backend confirms it.

---

# Phase 15 — Security Fixes

## Authentication

Prefer a backend-managed secure session where architecture permits it:

```text
HttpOnly
Secure
SameSite
```

Avoid making `localStorage` the long-term authority for authentication.

## Verification

Where required:

```text
authenticated == true
verified == true
```

must be enforced on the backend.

## Password Change

Send and validate:

```text
current_password
new_password
```

Do not collect the current password and ignore it.

## Forgot Password

Use a neutral response:

```text
If an account exists for that email, reset instructions have been sent.
```

Do not reveal account existence.

## Development Reset URLs

Never expose development reset URLs in production.

## Username Validation

Create a dedicated endpoint such as:

```text
GET /api/users/username-availability?username=...
```

Use states:

```text
available
unavailable
unknown
```

A network failure must not mean `available`.

## Roles

Client role checks are for UI only. Enforce authorization and ownership on the backend for every protected resource.

---

# Phase 16 — Fix Mobile and Responsive Layouts

Test:

```text
1440px
1024px
768px
375px
```

## Trip Workspace

Desktop may remain tabular/grid-based.

On mobile, stack itinerary fields vertically.

## Mobile Map

Add:

```text
[ Itinerary ] [ Map ]
```

or a clear `Show Map` control.

The map must not disappear completely on small screens.

## Budget

On narrow screens:

- stack panels
- use fluid widths
- use full-width controls
- convert dense tables to cards where appropriate
- use intentional horizontal scroll only when necessary

---

# Phase 17 — Accessibility

Replace clickable `div` elements with semantic controls.

Prefer:

```html
<button>
  <a>
    <input />
    <select></select
  ></a>
</button>
```

Add visible `:focus-visible` styles.

Ensure:

- labels are connected to inputs
- dialogs trap focus
- Escape closes dialogs
- focus returns to launcher
- touch controls remain discoverable
- buttons have accessible names

---

# Phase 18 — Standardize Error Handling

Create a shared API error/result model.

Avoid scattered:

```text
try/catch
console.warn
return []
alert(...)
```

Distinguish:

```text
empty result
network failure
permission failure
validation failure
server failure
```

Use a typed structure such as:

```text
success
data
error
status
retryable
```

or equivalent.

---

# Phase 19 — API Efficiency

Fix:

- duplicate trip requests
- N+1 destination requests
- stale autocomplete requests
- unnecessary external API calls

For autocomplete:

```text
debounce
→ abort previous request
→ send latest request
→ ignore stale responses
```

Use `AbortController` where appropriate.

---

# Phase 20 — Refactor Incrementally

Do not rewrite the app.

Move toward feature boundaries:

```text
features/
  trips/
  itinerary/
  bookings/
  budget/
  map/
  packing/
  profile/
  auth/
```

Move business logic out of giant page components gradually.

Split the global stylesheet incrementally.

Do not combine refactoring with a visual redesign.

---

# Phase 21 — Add Automated Tests

Minimum coverage:

## Authentication

- login
- logout
- protected routes
- verification gating
- role access

## Trips

- create
- edit
- delete
- duplicate
- failed mutation rollback

## Dates

- invalid ranges
- date conflicts
- timezone-safe date handling

## Destinations

- create
- remove
- Map/Workspace consistency

## Budget

- add funds
- add expense
- delete expense
- rollback
- currency calculations

## Bookings

- outside trip dates
- valid trip dates
- itinerary linking

## Responsive

Critical flows at:

```text
1440
1024
768
375
```

---

# Phase 22 — Advanced Features

Only after P1/P2 reliability work is stable.

## Conflict Detection

Detect:

```text
event overlap
transport overlap
booking overlap
event outside trip range
```

## Travel-Time Warnings

When coordinates exist:

```text
Event A
→ estimated travel time
→ Event B
```

Warn when the gap is shorter than the estimated travel time.

## Better Duplication

Offer explicit copy options:

```text
Copy dates
Copy destinations
Copy itinerary
Copy packing list
Copy budget categories
Copy bookings
```

## Export

After itinerary data is canonical, support:

```text
PDF
calendar export
print view
```

---

# Immediate Quick Wins

1. Fix `Accomodation` → `Accommodation`.
2. Replace category string comparisons with stable IDs.
3. Fix Dashboard booking count.
4. Keep expense forms open after failed saves.
5. Preserve form values after request failures.
6. Do not remove trips/destinations after failed deletion.
7. Replace fabricated country facts with `Not available`.
8. Remove fabricated accommodation information.
9. Add mobile map/list toggle.
10. Add visible keyboard focus.
11. Add missing input/label associations.
12. Make packing delete controls visible on touch devices.
13. Add a real 404 route.
14. Rename `Duplicate Trip` to `Copy Trip Details` until full duplication exists.
15. Add max lengths and normalization for trip/location names.
16. Cancel stale Mapbox autocomplete requests.
17. Add visible API error/retry states.
18. Remove production exposure of development reset data.

---

# Target User Flow

```text
Landing
→ Sign Up / Login
→ Verify Email
→ Onboarding
→ Dashboard
→ Create Trip
→ Add Destinations
→ Build Itinerary
→ Add / Link Transport
→ Add / Link Accommodation
→ Add / Link Bookings
→ Set Budget
→ Record Expenses
→ Packing
→ Review Trip
→ Trip Dashboard
```

Alternative paths should join the same data:

```text
Explore
→ Select Place
→ Create Trip with Destination
→ Trip Workspace
```

```text
Trip Workspace
↔ Map
```

```text
Booking
→ Itinerary Event
→ Budget
```

```text
Edit Dates
→ Impact Review
→ Resolve Conflicts
→ Save
```

---

# Recommended Implementation Order

## P1 — Stability

1. Define backend/database contracts.
2. Create canonical destination and itinerary data.
3. Remove local-only authority for core trip data.
4. Standardize mutation success/failure behavior.
5. Repair Dashboard/Create Trip.
6. Repair Explore/Plan Trip.
7. Unify Map and Trip Workspace destinations.
8. Fix budget semantics.
9. Add date validation.
10. Fix security-sensitive authentication flows.
11. Fix mobile blockers.
12. Add regression tests.

## P2 — Integration

13. Add itinerary events.
14. Link bookings to itinerary.
15. Add accommodation records.
16. Add transport records.
17. Sync packing lists.
18. Improve journal persistence.
19. Improve accessibility.
20. Standardize error/loading/sync states.
21. Optimize API calls.
22. Refactor oversized components gradually.

## P3 — Enhancements

23. Schedule conflict detection.
24. Travel-time warnings.
25. Better trip duplication.
26. PDF/calendar exports.
27. Optional offline support.
28. Additional recommendation features.

---

# Rules for the Coding Agent

- Do not rebuild the entire application at once.
- Work phase by phase.
- Preserve the existing visual identity and color palette.
- Keep existing working functionality operational.
- Do not add major features before P1 reliability issues are fixed.
- Never replace a real backend failure with fake success.
- Never fabricate factual travel data.
- Do not use `localStorage` as the authoritative database for account-owned trip data.
- Prefer stable server IDs.
- Validate important business rules on both frontend and backend.
- Add tests alongside important fixes.
- Keep each implementation batch small enough to test independently.

---

# Definition of Done

The remediation is successful when:

- a trip looks the same after refresh
- a trip looks the same on another device
- Map and Workspace show the same destinations
- failed API writes are visible and recoverable
- bookings belong to the itinerary
- accommodation is real data, not inferred data
- transport belongs to the itinerary
- budget totals agree everywhere
- changing dates cannot silently create invalid plans
- mobile users can access the full planner
- authentication flows do not expose incorrect success states
- core workflows have automated tests
- future features can be added without creating more disconnected data systems
