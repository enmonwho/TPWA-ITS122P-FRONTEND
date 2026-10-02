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
