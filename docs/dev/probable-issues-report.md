# Probable Issues Report

Date: 2026-04-16
Scope: Documentation review + static audit of core runtime files (`index.html`, `sw.js`, `js/store.js`, `js/supabase.js`, `js/charts.js`, `package.json`).

## 1) High: Service Worker install can fail due to missing assets

- Evidence:
  - `sw.js` pre-caches many CSS files in `ASSETS` (`css/variables.css`, `css/base.css`, `css/dashboard.css`, etc.).
  - Repository currently contains only `css/tailwind.css`, `css/auth.css`, and `css/overrides.css`.
- Why this is risky:
  - `cache.addAll()` fails the entire install if any listed asset is missing.
  - This can prevent the service worker from activating, breaking offline support and cache updates.
- Recommendation:
  - Keep `ASSETS` aligned with real files only.
  - Or switch install caching to a resilient approach that skips missing files and logs them.

## 2) High: Cloud deep-merge does not honor canonical timestamp field

- Evidence:
  - Data model docs and JSDoc describe `updated_at` as merge authority.
  - `js/supabase.js` `deepMergeArrays()` compares `createdAt` and `updatedAt` (camelCase), not `updated_at` (snake_case).
- Why this is risky:
  - Newer records that only update `updated_at` can be treated as older during conflict resolution.
  - This can cause subtle cross-device data loss or stale overwrites.
- Recommendation:
  - Make merge logic read `updated_at` first (and optionally fallback to legacy fields).
  - Add tests/fixtures for mixed-format records.

## 3) Medium: Boot can crash on corrupted `localStorage` JSON

- Evidence:
  - `js/store.js` initializes arrays with direct `JSON.parse(localStorage.getItem(...))` calls outside `try/catch`.
- Why this is risky:
  - A malformed stored value (manual edits, partial writes, extension interference) throws and can stop app initialization.
- Recommendation:
  - Wrap all startup parses in safe parse helpers with fallback to `[]`.
  - Optionally quarantine bad data and show a recovery toast.

## 4) Medium: Revision analytics path assumes `session.revisions` always exists

- Evidence:
  - `js/charts.js` accesses `session.revisions[revType]` and `s.revisions.rev2/rev4/rev7` directly in multiple places.
- Why this is risky:
  - Legacy or partial records without a `revisions` object can throw runtime errors when opening Insights/AI flows.
- Recommendation:
  - Normalize session shape once at load time.
  - Add defensive guards in charts: skip or auto-migrate malformed entries.

## 5) Low: Build/doc workflow drift can confuse contributors

- Evidence:
  - `README.md` says "no build step required."
  - `package.json` includes Tailwind input/output pipeline (`src/input.css -> css/tailwind.css`) and only a watch script (`build:css` with `--watch`).
- Why this is risky:
  - New contributors may not know when CSS must be rebuilt.
  - CI/non-interactive usage of `build:css` can hang due to watch mode.
- Recommendation:
  - Update docs with explicit CSS build commands.
  - Split scripts into `build:css` (one-shot) and `dev:css` (`--watch`).

## Notes

- Existing `docs/dev/known-issues.md` already tracks architectural debt; the issues above are additional concrete implementation risks observed in current files.
- No runtime instrumentation was applied in this pass because this is a documentation + static risk audit, not a live bug reproduction workflow.
