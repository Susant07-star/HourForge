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
- **Simplicity Over Features**: Prefer a clean, fast UI over complex nested features.
- **Vanilla JS**: This is NOT a React/Vue app. Do not introduce build tools, Webpack, or Vite unless explicitly instructed.

## 4. Core Application Flow
1. **Start Study**: User taps "Start" on the Home/Study tab.
2. **Timer**: Focus timer runs in real-time.
3. **Stop**: User stops the session.
4. **Auto Log**: The session is automatically saved to `study_sessions`.
5. **AI Feedback**: AI provides a 1-2 line "Psychology Insight" or performance rating.
6. **Revision Scheduled**: 3 revision tasks (2-day, 4-day, 7-day) are automatically created in the `revision_tasks` table.

## 5. Important Files
- **`script.js`**: The monolithic main engine. Handles state, sync, and DOM rendering.
- **`js/charts.js`**: The analytics and AI prompt engine. Handles Groq API communication.
- **`index.html`**: The monolithic view layer (all screens are here).
- **`style.css`**: The design system (Glassmorphism, custom swipe logic).
- **`sw.js`**: Service worker for PWA functionality.

## 6. Development Warnings
- **No Build Tools**: All JS is served directly. Use ES6+ features sparingly if compatibility is an issue, but prioritize modern browser support.
- **DOM Performance**: Use `DocumentFragment` for batch rendering. Avoid `container.innerHTML += ...` in loops to prevent massive reflow lag.
- **Global State**: Most state is currently in global variables (e.g., `studySessions`, `timeLogs`). Be careful with scope.

---
*This file is optimized for AI interpretation (Gemini, ChatGPT, Roo, Claude).*
