# 🧠 HourForge Developer & AI Guide

Welcome to the HourForge codebase! If you are a human developer or an AI assistant (like ChatGPT, Claude, or Antigravity) tasked with maintaining or expanding this app, **read this document first**.

This guide is designed to save you API credits, prevent regressions, and make debugging effortless.

---

## 🏗️ Architecture Overview

HourForge is a **Vanilla JS Single Page Application (SPA)** with Progressive Web App (PWA) capabilities. It has no build step (no Webpack, Vite, or React).

**Core Files:**
- `index.html`: The monolithic view layer containing all markup, dialogs, and the PWA loading sequence. Views are toggled via CSS `.active` classes.
- `style.css`: All styling. Uses CSS variables for theming and standard glassmorphism UI.
- `script.js`: The central "brain". Handles state management, local database wrappers, Supabase auth/sync, and DOM event wiring.
- `js/charts.js`: Extracted logic for all `Chart.js` rendering and Groq AI API calls.
- `sw.js`: The Service Worker handling offline caching.

---

## 💾 Data Flow & State Management

**DO NOT ATTEMPT TO REWRITE THE SYNC LOGIC WITHOUT UNDERSTANDING THIS.**

The app uses a hybrid "Offline-First" storage model:
1. **Primary Storage**: `localStorage` (for `studySessions`, `timeLogs`, `studentProfile`, etc.).
2. **Secondary/Migration**: `IndexedDB` (via a lightweight wrapper in `script.js`) is used for larger objects, though most current logic relies on `localStorage`.
3. **Cloud Sync**: Supabase (PostgreSQL).

### The Deep Merge Strategy (Critical) ⚠️
We use a function called `deepMergeArrays()` in `script.js`. 
- Every database record (study session, time log) **must** have a unique `id` (`crypto.randomUUID()`) and an `updated_at` timestamp (Unix epoch in ms).
- When syncing, local and cloud arrays are merged by `id`. The record with the newer `updated_at` wins. 
- *Never* use array length or sequence to determine which dataset is "newer". 

---

## 🧭 Code Map (`script.js`)

`script.js` is large. Navigate it using these distinct regions:

1. **Setup & Initialization**: Sentry error tracking, Profile defaults, dynamic color generation.
2. **Global State**: Retrieving `studySessions`, `timeLogs`, `aiRatingsHistory`.
3. **Storage Wrappers**: IndexedDB helper (`idb`).
4. **Supabase Auth & Sync**: `onAuthStateChange` listeners, `syncDataWithCloud()`, Realtime subscriptions. Note: Auth relies *only* on `onAuthStateChange(INITIAL_SESSION)`, never `getSession()` (to prevent race conditions).
5. **App Initialization (`init`)**: Sets UI dates, updates dashboard, calculates streaks.
6. **Mobile Navigation (Swipe Logic)**: Custom Instagram-style horizontal swipe. **Swipe is completely disabled when `document.fullscreenElement` is set** — this prevents accidental tab changes during Pomodoro fullscreen.
7. **Core Logic (CRUD)**: Adding sessions, logging time, Pomodoro timer management.
8. **Render Functions**: `renderAllTopics()`, `renderTimeLogs()`, etc.
9. **Pomodoro Timer Engine** (`~line 3900+`): `setPomoMode()`, `getTotalCycles()`, `updatePomoDisplay()`, tick loop, audio synthesizers, Wake Lock, and fullscreen idle-fade state machine.

---

## ⏱️ Pomodoro Timer Architecture

### Single Source of Truth
There is **one and only one** Pomodoro engine in the codebase. The legacy `POMO` object and all associated `pomoStart()` / `pomoPause()` / `pomoReset()` functions were removed in v2.2. If you see any reference to `const POMO =` or `POMO.running`, it is a regression — delete it.

### Key State Variables
```js
let isPomoRunning = false;   // Is the countdown actively ticking?
let pomoTimeLeft = 0;         // Seconds remaining in current mode
let pomoMode = 'focus';       // 'focus' | 'short'
let pomoCurrentCycle = 1;     // Current cycle number (1-indexed)
let pomodorIntervalId = null; // setInterval handle — cleared on pause/stop
let wakeLock = null;          // Screen Wake Lock API handle
let noSleepVideo = null;      // Silent video element for iOS Wake Lock fallback
```

### Cycle Calculation (Dynamic)
Total cycles are **never hardcoded**. They are always calculated on-the-fly:
```js
function getTotalCycles() {
    const totalMinutes = parseFloat(pomoTotalHours.value) * 60;
    return Math.max(1, Math.floor(totalMinutes / (focusMin + shortMin)));
}
```
This means the "X of Y" display always correctly reflects whatever custom focus/break durations the user enters.

### Fullscreen UX State Machine
The fullscreen mode operates a 3-second idle-fade system:
- **`showFsControls()`** — Removes `fullscreen-idle` class, sets `fs-visible` on the controls bar.
- **`hideFsControls()`** — Adds `fullscreen-idle` class, sets `fs-hidden` to animate controls away.
- **`resetFsIdle()`** — Called on `mousemove`/`touchmove`. Calls `showFsControls()` and resets a 3-second `setTimeout` to `hideFsControls()`.
- **Click Toggle** — A single click on the background while controls are visible hides them instantly. A click while hidden shows them and restarts the idle timer.
- **Swipe Lock** — The `touchstart` handler for the global Instagram-swipe checks `document.fullscreenElement` and returns early, preventing accidental tab changes in fullscreen.

### Wake Lock Strategy
1. **Primary**: `navigator.wakeLock.request('screen')` — works on Android Chrome and desktop.
2. **Fallback (iOS Safari)**: A tiny, muted, loop `<video>` element with a base64-encoded WebM source is injected into `<body>` and `.play()`ed while the timer is active. This prevents iOS from sleeping. The video is hidden and silent.

### Audio System
Audio is synthesized via the **Web Audio API** (`AudioContext`) — no external audio files are needed.
- **`playTick()`** — Fired at 10 seconds remaining. Two `triangle` wave oscillator pulses at 600 Hz.
- **`playRing()`** — Fired when a session ends. Six rapid `square` wave pulses at 800 Hz (crisp digital alarm).

### Mode-Based Theming
When `setPomoMode(mode)` is called, it adds a class to the `#pomodoroView` element:
- **`mode-focus`** → The timer card glows with a subtle **red border + background tint**.
- **`mode-short`** → The timer card glows with a subtle **green border + background tint**.
In fullscreen, the glow extends to a full radial-gradient background behind the card.

---

## 🤖 Directives for Future AI Models

If you are an AI reading this, adhere strictly to these rules:

1. **DOM Manipulation Performance**: When rendering lists (like `renderTimeLogs` or `renderTableView`), **do not use `container.innerHTML += ...` in a loop.** This causes severe reflow lag. Always use a `DocumentFragment` to batch DOM appends as currently implemented.
2. **Tab Navigation (Swipe)**: The app uses an Instagram-style horizontal drag swipe. All view translation logic uses `position: absolute` on sibling elements while leaving the active element in normal flow. **Do not use `position: fixed` for swipe tabs**, as it breaks the header layout.
3. **Fullscreen Swipe Lock**: The swipe `touchstart` handler bails out early when `document.fullscreenElement` is truthy. **Never remove this guard** — without it, tab swipes silently fire during Pomodoro fullscreen.
4. **Global Scope**: `script.js` and `js/charts.js` share globals (`studySessions`, `timeLogs`, etc.). Do not wrap `script.js` in a closed IIFE or ES Module unless you explicitly export/mount these globals to `window`, as `charts.js` relies on them.
5. **Error Handling**: Use the built-in `showToast(msg, type)` function for user-facing errors rather than native alerts.
6. **Single Pomodoro Engine**: There is exactly one timer engine in `script.js` (around line 3900+). The legacy `POMO` object was deleted in v2.2. Do not re-introduce it. If you find any code referencing `POMO.running`, delete it as a regression.
7. **Fullscreen CSS Overrides**: All fullscreen element hiding uses both `:fullscreen` and `:-webkit-full-screen` selectors with `!important`. When adding new elements that must be hidden in fullscreen, add them to both selector blocks in `style.css` around line 3885. 

---

## 🔄 Strict AI Self-Maintenance Directive

**ATTENTION LLMs / AI AGENTS:** Codebases evolve. If you are reading this document to solve a user prompt, you MUST adhere to the following rules regarding documentation hygiene:

1. **Verify Before Trusting**: Before relying blindly on the code maps or JSDoc typings above, quickly `grep` or `view_file` the actual code to ensure these patterns haven't been refactored since this file was last edited.
2. **Update the Docs**: If YOU implement a major architectural change (e.g., changing how Cloud Sync deep merges data, adding a new global variable dependency, or moving logic out of `script.js`), **it is your strict responsibility to update `DEVELOPER.md` and the JSDoc typings in `script.js` to reflect your changes before completing your task.** 
3. Do not leave "stale" comments for the next AI. If you break a rule listed in `DEVELOPER.md` because a better pattern emerged, rewrite the rule in this file!

---

## 🐛 Debugging Guide

### Hard Resetting the App
If state becomes corrupted:
1. Open DevTools -> Application -> Storage -> Clear site data.
2. This wipes `localStorage`, IndexedDB, and the Service Worker.
3. Refresh the page. It will boot cleanly as a new guest.

### Bypassing Supabase (Offline Mode)
If you need to test pure offline functionality without Supabase initializing:
- Block the Supabase JS CDN URL in your browser's network tab.
- The app has a 2.5-second fallback timer that will automatically boot into offline mode.

### Clearing the PWA Cache
If CSS or JS changes aren't reflecting:
- Open `index.html` and bump the `CURRENT_SW_VERSION` string. This forces users' browsers to delete the old cache and install the new service worker assets.

---

*Written to ensure HourForge remains stable, fast, and delightful to develop for.*
