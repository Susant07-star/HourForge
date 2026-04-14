# 🛠️ Coding Rules (Strict Standards)

## 1. Documentation Sync Rule (CRITICAL)
**No feature is complete until its documentation is updated.**
- **Rule**: If a code change modifies an object structure (e.g., `StudySession`), a sync logic step, or a UI flow, the corresponding `.md` file in `/docs` MUST be updated in the SAME pull request/commit.
- **Mismatch**: If the code and docs mismatch, the **Docs are considered WRONG**, and the developer must fix the docs immediately.

## 2. Synchronization Integrity
- **Mutation Pattern**: Never update a global array or object without also updating the `updated_at` field: `item.updated_at = Date.now()`.
- **Identity**: All records must have a `crypto.randomUUID()`-generated `id`.
- **Merge Logic**: Do not modify the `deepMergeArrays()` function in `script.js` without full architectural review. It is the single point of failure for sync.

## 3. DOM & Performance
- **Batch Updates**: Use `DocumentFragment` when rendering large lists (e.g., History logs, Revision cards).
- **Reflow Minimization**: Avoid calling `element.innerHTML += ...` in a loop. Build the full HTML string first or use `appendChild` to a fragment.
- **Event Delegation**: Attach listeners to the main container (e.g., `tabContainer`) rather than individual cards where possible.

## 4. State Management
- **Single Source of Truth**: All UI elements (`innerHTML`, `value`) MUST be derived from the global state arrays. Never store state "hidden" in the DOM attributes.
- **Side-Effects**: CRUD operations should always trigger:
  1. `saveToLocal()`
  2. `uploadDataToCloud()`
  3. `switchTab()` or `renderXView()`.

## 5. JavaScript Cleanliness
- **Modularity**: While the app is currently monolithic, use **Function Decomposition** to keep logic blocks small (<50 lines).
- **Comments**: Every major logic block (e.g., "AI Prompt Construction") MUST have a standardized header comment.
- **No Build Tools**: Write code that runs natively in modern Chromium browsers. No `npm install`, no `import/export` (unless using ESM natively), no `require()`.

---
*Following these rules ensures the 4k-line monolith remains manageable and stable.*
