# 🤖 AI_CONTEXT.md

## 1. App Summary
**HourForge (StudyTracker)** is a high-performance, offline-first study companion designed for students using the **2-4-7 Spaced Repetition** method. It combines a real-time study timer with automated revision scheduling and AI-driven coaching.

## 2. Core Philosophy
- **Real-time Study Companion**: The app moves away from manual logging. It focuses on live "Start/Stop" study sessions.
- **Discipline First**: The goal is to lower the barrier to starting study through an anti-procrastination timer and immediate tracking.
- **Data-Driven Growth**: Every session feeds into an AI coach that provides granular, "brutally honest" performance feedback.

## 3. Critical Rules (DO NOT BREAK)
- **Synchronization**: We use a **Deep Merge** strategy (`id` + `updated_at`). Never delete a record without updating its `updated_at` or handling the sync tombstone.
- **Timestamps**: Always update the `updated_at` (Unix epoch in ms) field on every data mutation.
- **Automated Logging**: Study hours are "earned" via the Pomodoro timer. Manual logging is a secondary fallback.
- **Fair Play**: We only log sessions >= 5 minutes.
- **Vanilla JS**: No React/Vue. No build steps.

## 4. Core Application Flow
1. **Setup**: User selects a Subject chip in the Pomodoro tab.
2. **Focus**: User starts the Pomodoro timer.
3. **Tracking**: The app tracks actual focus time (excluding pauses).
4. **Auto Log**: Upon completion (or manual reset after 5 mins), the session is automatically saved to `timeLogs` via `addTimeLogEntry`.
5. **AI Feedback**: Insights are built based on actual verified focus time.

## 5. Important Files
- **`js/pomodoro.js`**: The timer engine and automated logging trigger.
- **`js/timeTracker.js`**: The history feed and core `addTimeLogEntry` API.
- **`js/store.js`**: IndexedDB storage and profile management.
- **`js/charts.js`**: AI analytics and Groq API logic.
- **`index.html`**: The monolithic view layer.

## 6. Development Warnings
- **Modular JS**: Logic is split across files in `/js`. Do not re-introduce a monolithic `script.js`.
- **DOM Performance**: Use `DocumentFragment` for batch rendering.
- **Global State**: Managed via `localStorage` and `store.js` arrays.

---
*This file is optimized for AI interpretation (Gemini, ChatGPT, Roo, Claude).*
