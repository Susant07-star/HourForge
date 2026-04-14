# 🚩 Known Issues & Technical Debt

## 1. Monolithic Script (Primary Debt)
- **Problem**: `script.js` currently exceeds 4,000 lines. The lack of modularity makes it difficult to debug and slows down new feature additions.
- **Root Cause**: The application was built as a single-file MVP and has outgrown its original scale.
- **Risk**: Refactoring a single segment (e.g., sync) can cause unexpected side-effects in an unrelated view (e.g., charts).

## 2. Global State Pollution
- **Problem**: All application state is held in global arrays (e.g., `studySessions`).
- **Risk**: These variables are accessible and mutable from any part of the app, making **Race Conditions** and **Data Corruption** a reality for multi-device users.
- **Future Solution**: Encapsulate state in a `Store` object or move to **Zustand**.

## 3. Manual DOM Rendering
- **Problem**: Every UI update is a manual "Clear and Rebuild" process (e.g., `container.innerHTML = ''`).
- **Performance**: While `DocumentFragment` mitigates some lag, large lists (history logs) still cause **Jank** during intensive re-renders.
- **Lack of Reactivity**: There is no "Binding" between state and UI. If `studySessions[0].topic` changes, the UI will not update until a manual `render()` function is called.

## 4. Sync Loop Vulnerability
- **Problem**: The **Deep Merge Strategy** depends on client-side timestamps (`updated_at`).
- **Edge Case**: If a user's device clock is incorrect, their "New" data might be treated as "Old" in the merge, leading to data loss.
- **Planned Fix**: Use **Supabase Server-Side Timestamps** as the definitive source in a future sync refactor.

## 5. CSS Monolith
- **Problem**: `style.css` is nearly 4,000 lines. Finding specific component styles is difficult.
- **Planned Fix**: Break down the CSS into "Modules" (e.g., `components.css`, `layouts.css`, `animations.css`).

---

## ✅ Resolved Issues (Archived)

### ~~Ghost "25-Minute" Timer~~ — Fixed in v2.2
- **Was**: The legacy `POMO` object (from the old popup modal era) was still running alongside the new timer engine, creating two simultaneous countdowns.
- **Fix**: Deleted the entire legacy block (~200 lines) from `script.js`. There is now exactly one Pomodoro engine.

### ~~Fullscreen Tap Not Registering (iOS/Android)~~ — Fixed in v2.2
- **Was**: Tapping the fullscreen background on mobile did not toggle the floating controls. Only swipe/drag gestures worked.
- **Fix**: Added `cursor: pointer` to `#pomodoroView:fullscreen` and `-webkit-tap-highlight-color: transparent`. Mobile browsers now fire click events on the fullscreen background reliably.

### ~~Tab Swipe in Fullscreen~~ — Fixed in v2.2
- **Was**: Swiping left/right during fullscreen mode silently changed the active tab. When the user exited fullscreen, they found themselves on a different tab.
- **Fix**: Added `if (document.fullscreenElement) return;` at the top of the `touchstart` handler in the swipe IIFE.

---
*Technical debt is documented to ensure future refactors tackle the most critical stability risks first.*
