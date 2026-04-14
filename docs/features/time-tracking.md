# ⏱️ Time Tracking

## 1. Feature Strategy Shift
HourForge is moving away from **Manual Logging** (where a student enters data after the fact) to a **Real-time Study Companion** (where the student starts a timer at the moment they begin studying).

## 2. NEW: Real-time Study Companion
The primary goal is to lower the friction of starting study and increase data accuracy.

### 🌊 Flow:
1. **Initiation**: Student selects a **Subject** and **Topic** on the "Study" tab.
2. **Start**: They tap the "Start Study" button.
3. **Tracking**: A live timer appears. The app enters "Focus Mode."
4. **Completion**: They tap "Finish Study."
5. **Auto Log**: The system calculates the `total_duration` and automatically creates a new `study_sessions` record.
6. **AI Loop**: AI provides a 1-2 line performance insight immediately after the stop.

### 🎨 UI Design (Planned):
- **Tab Name**: "Study" (Home icon).
- **Primary Widget**: A large, centered circular timer or a sleek progress bar.
- **Micro-Interactions**: Visual pulsing animation during active study.
- **One-Tap Actions**: "Finish Session" or "Pause" (legacy-lite).

## 3. LEGACY: Manual Time Logging
While being deprecated, this system is still supported for historical reasons or for students who forget to use the timer.

### 🌊 Manual Flow:
1. Navigate to "Hours" tab.
2. Manually enter **Subject**, **Task Name**, **Start Time**, and **End Time**.
3. Use **Smart Duration Chips** (+15m, +30m) to adjust times quickly.
4. Click "Save Log."

### ⚠️ Problems with Manual Logging:
- **UX Friction**: Requires too many clicks (subject, task, time, finish).
- **Procrastination Gap**: Students often forget to log until hours later, leading to "guesstimating" data.
- **Complexity**: Manual clock pickers are slow and prone to errors.

## 4. Background Visibility (The "Always-On" Feature)
To keep the timer useful without needing the browser to be actively open on the screen, we utilize specific PWA capabilities:

- **Task Switcher Tracking**: Every tick of the timer updates `document.title` to `(14:59) Focus` so the user can check the remaining time in their OS tab switcher.
- **Lock Screen Widget**: Uses the `MediaSession` API combined with our silent WakeLock video to display a "Now Playing" widget on iOS/Android lock screens with the live time remaining.
- **Push Alerts**: Requests `Notification.requestPermission()` at the start of a timer and pushes an OS-level vibrate/notification alerting the user when a session triggers `00:00`.
- **Audio Clues**: A synthetic digital `playRing()` alarm plays natively on timer completion.

## 5. Automatic Revision Coupling
Every study session logged (whether via Timer or Manual) automatically triggers the **2-4-7 Spaced Repetition Engine**.

- **Auto-Gen**: Three `revision_tasks` are created with `due_date` set to Date + 2, Date + 4, and Date + 7.
- **Notification**: These tasks appear in the "Revisions" tab when they become due.

---
*The goal is "Set and Forget." The student should focus on studying, not on the app.*
