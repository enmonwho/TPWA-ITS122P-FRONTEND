# LakBye Handoff — Branch: `oct4-not-yet-tested`

**Date:** October 5, 2026  
**Branches:**

- Frontend: `oct4-not-yet-tested` (`https://github.com/enmonwho/TPWA-ITS122P-FRONTEND.git`)
- Backend: `oct4-not-yet-tested` (`https://github.com/AdysonReales/TPWA-ITS122P-BACKEND.git`)

---

## 1. Summary of What Was Implemented & Fixed

### A. Backend (`TPWA-ITS122P-BACKEND`)

1. **Staff Dashboard & `/dashboard/bookings` HTTP 500 Errors (`column c.id does not exist`)**:
   - **Root Cause**: The Supabase PostgreSQL database defined `categoryid` instead of `id` in the `categories` table. The query in `activities.controller.js` joined on `c.id`, triggering error `42703 (column c.id does not exist)`.
   - **Fix**: Added `initCategoriesTable()` in `controllers/categories.controller.js` to automatically run `ALTER TABLE categories ADD COLUMN IF NOT EXISTS id INTEGER GENERATED ALWAYS AS (categoryid) STORED;` (or equivalent fallback), and wired it into `index.js`.
2. **Bookings Column Error (`column b.submitted_at does not exist`)**:
   - **Root Cause**: The query in `bookings.controller.js` expected `b.submitted_at`.
   - **Fix**: Added auto-migration in `bookings.controller.js` adding column `submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP` and updated queries to use `COALESCE(b.submitted_at, b.booking_date, b.created_at) AS submitted_at`.
3. **Missing `vendor_profiles` Table**:
   - Added `initVendorTable()` in `controllers/vendors.controller.js` to create `vendor_profiles` and attach the foreign key if missing.
4. **Budget Expenses Deletion / Disappearance**:
   - **Root Cause**: Custom destination IDs (such as `dest-custom-174000...`) were passed to PostgreSQL integer column `destination_id`, throwing a syntax error.
   - **Fix**: In `controllers/expenses.controller.js`, custom destination string IDs are safely parsed or stored as `null` in `destination_id` to prevent PostgreSQL query errors. Removed strict blocking balance check so expenses can still be tracked.

---

### B. Frontend (`TPWA-ITS122P-FRONTEND`)

1. **Map View (`/dashboard/map`) Crash**:
   - **Fix**: `MapView.tsx` guarded `dest.latitude` and `dest.longitude` with `Number(dest.latitude).toFixed(4)` to prevent `TypeError: dest.latitude.toFixed is not a function`.
2. **Dashboard "Delete Trip?" Modal**:
   - **Fix**: Added `.delete-trip-modal-card` in `src/index.css` and updated `src/pages/Dashboard.tsx` with proper text wrapping (`white-space: normal`, `max-width: 380px`), fixing the issue where text broke into one word per line.
3. **Trip Workspace (`/trip/:tripId`)**:
   - **Country Removal Fallback**: In `tripExtras.ts` and `TripWorkspace.tsx`, removing all countries no longer forces `'Philippines'`. An empty route state is rendered with a `+ Add Country` button.
   - **Add Country Modal**: Multi-selection is now supported without replacing existing selections.
   - **Days Input Field**: Keystroke clamping removed; users can type numbers freely (e.g. `2` on an 8-day trip) without it jumping to max. Bounds are checked cleanly on blur.
   - **Popular Places & Custom Places**: Expanded `POPULAR_PLACES` in `tripAutoFill.ts` to include popular Japanese destinations (Okinawa, Yokohama, Nagoya, Kobe, Hakone, Kanazawa, Kamakura, Nikko, Shirakawa-go, etc.) and Korean destinations (Incheon, Daegu, Gyeongju, Gangneung, Suwon, Jeonju, Sokcho, etc.). Users can also type any custom place name and add it to any country.
4. **Trip Budget (`/trip/:tripId/budget`)**:
   - **Local Currency Conversion**: Added `KRW` (South Korean Won ₩) to `src/lib/currency.ts`. When a trip budget currency differs from the destination country's currency (e.g., JPY budget with trips in South Korea), a subtle conversion hint (e.g., `≈ ₩12,500 KRW`) is displayed under the cost in both the expense table and the Add Expense modal.
   - **Expense Retention**: `handleAddExpenseSubmit` retains expenses in optimistic state/localStorage even if backend sync experiences a temporary delay.
5. **Trip Settings (`/trip/:tripId/settings`)**:
   - Removed the "Friends" privacy option, leaving a clean 2-column layout for **Private** and **Public**.

---

## 2. How to Run Locally

### Start Backend:

```bash
cd "TPWA-ITS122P-BACKEND"
npm install
npm start
# Runs on http://localhost:5000
```

### Start Frontend:

```bash
cd "TPWA-ITS122P-FRONTEND"
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## 3. Checklist for Next Tester / Developer

- [ ] Open `/dashboard` and click delete on a trip to verify modal text reads as a clean, centered paragraph.
- [ ] Open `/dashboard/map` to ensure markers load without `dest.latitude.toFixed` errors.
- [ ] Open `/dashboard/bookings` and verify staff/customer bookings load live from the backend (`GET /api/bookings`).
- [ ] Open `/trip/:tripId`:
  - [ ] Remove all countries and ensure route is empty rather than defaulting back to Philippines.
  - [ ] Add multiple countries in the modal.
  - [ ] Change the "Days" number for a destination by typing (e.g. `2`).
  - [ ] Try typing a custom destination name and clicking `+ Add "[Name]" to [Country]`.
- [ ] Open `/trip/:tripId/budget`:
  - [ ] Create an expense and verify it persists and does not revert to empty state.
  - [ ] Check currency conversion display if budget currency is different from the country of destination.
- [ ] Open `/trip/:tripId/settings`:
  - [ ] Verify only "Private" and "Public" exist under Privacy & Visibility.
