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
*Technical debt is documented to ensure future refactors tackle the most critical stability risks first.*
