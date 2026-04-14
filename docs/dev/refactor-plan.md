# 🛠️ Refactor Plan (Phase-Based Migration)

## 1. Overview
HourForge's current monolithic architecture is sufficient for Beta, but as it scales, we need to transition to a more maintainable, modular, and reactive system.

## 2. Phase 1: Stabilization (2 Weeks)
**Goal**: Reduce the risk of sync-loops and state corruption.

- **Encapsulate State**: Move global arrays into a `Store` object. This centralizes `localStorage` and `uploadDataToCloud()` calls.
- **Isolate Sync Logic**: Extract the **Deep Merge** and **Supabase Realtime** listeners into a standalone `sync.js` module.
- **Componentize CSS**: Break the 4,000-line `style.css` into smaller files (e.g., `base.css`, `layout.css`, `components.css`).

## 3. Phase 2: UX Simplification (3 Weeks)
**Goal**: Transition to the **Real-time Study Companion** flow.

- **Timer Engine**: Build a robust, background-aware timer in `script.js`.
- **UI Rewrite**: Simplify the index.html monolithic structure into 5 clear tab-views.
- **AI Rule Change**: Implement the 1-2 line "Punchy Feedback" rule across all prompts.
- **Legacy Cleanup**: Hide the manual time-logging UI behind a "Backup" menu.

## 4. Phase 3: Framework Migration (Optional)
**Goal**: Leverage reactive rendering and componentized logic.

- **Stack**: **React (Vite) + Tailwind CSS + Zustand**.
- **Migration Strategy**:
  1.  Initialize a new React repository.
  2.  Copy over the core logic from `sync.js` and `charts.js` (minimal edits needed).
  3.  Re-build the UI using Tailwind for a more consistent design system.
  4.  Replace manual DOM rendering with React components and stateful logic.

## 5. Success Metrics
- **Performance**: <100ms for UI view switches.
- **Stability**: Zero sync-loop reports from multiple devices.
- **Maintainability**: Reduced file sizes (e.g., `script.js` split into 10+ modules).

---
*Refactoring happens in parallel with feature development. NEVER compromise the "Study Companion" core flow for architectural experiments.*
