# 🧊 State Management (Current & Future)

## 1. Executive Summary
HourForge currently utilizes a **Global Variable State Pattern** within a single JavaScript file (`script.js`). While functionally sufficient for the MVP, this approach is the primary driver of technical debt and must be managed carefully until the Phase 3 refactor to a modern framework (React/Next.js).

## 2. Current Global Arrays
The following arrays are globally accessible and act as the single source of truth for the UI:

| State Variable | Source (Storage) | Purpose |
| :--- | :--- | :--- |
| `studySessions` | `localStorage['studySessions']` | All 2-4-7 Spaced Repetition items. |
| `timeLogs` | `localStorage['timeLogs']` | All past study activity (Legacy/Manual). |
| `aiRatingsHistory` | `localStorage['aiRatingsHistory']` | Daily/Weekly performance scores. |
| `studentProfile` | `localStorage['studentProfile']` | User name, grade, subjects, and exam dates. |

## 3. The Lifecycle of a State Change
When a user interacts with the UI, the state flows in a predictable (but manual) sequence:

1. **Mutation**: A function (e.g., `addStudySession`) pushes a new object into a global array.
2. **Persistence**: `localStorage.setItem()` is called immediately after mutation.
3. **Synchronization**: `uploadDataToCloud()` is called to sync with Supabase.
4. **Re-rendering**: The corresponding UI render function (e.g., `renderDashboard()`) is called to update the DOM.

## 4. Risks & Technical Debt
*   **Race Conditions**: Without an encapsulated state manager, simultaneous updates (like a manual log + a realtime sync) can overwrite one another.
*   **Encapsulation Leakage**: Side-effects (like syncing) are scattered throughout CRUD functions rather than being centralized.
*   **Scalability**: The 4,000-line `script.js` is difficult to navigate when all state logic exists in the global scope.

## 5. Future Migration Path (Zustand/Redux)

### Phase 1: Object Encapsulation (Next Step)
Before moving to React, we should wrap our state in a single object to centralize persistence logic:

```javascript
const State = {
    _data: { studySessions: [], timeLogs: [] },
    setStudySessions(val) {
        this._data.studySessions = val;
        this.save();
    },
    save() {
        localStorage.setItem('studySessions', JSON.stringify(this._data.studySessions));
        uploadDataToCloud();
        renderAllViews();
    }
};
```

### Phase 2: React State
Upon migrating to React, the state will be managed using **Zustand**. This allows for:
- Selective re-renders (Performance).
- DevTools integration (Debugging).
- Decoupling of UI logic from persistence logic.

---
*Rule of Thumb: If you modify a global array, you MUST call the corresponding `render` function and `uploadDataToCloud()`.*
