# ⏱️ Pomodoro Timer

## Overview
HourForge includes a fully-featured, production-grade Pomodoro Timer built entirely with the Web Audio API, the Fullscreen API, and the Screen Wake Lock API. It requires no third-party libraries.

The timer is accessible via the dedicated **Pomodoro tab** in the bottom navigation bar.

---

## 1. Core Timer Logic

### State Variables
The entire timer state is held in module-level variables in `script.js` (~line 3900):

| Variable | Type | Description |
|---|---|---|
| `isPomoRunning` | `boolean` | True when the countdown is actively ticking |
| `pomoTimeLeft` | `number` | Seconds remaining in the current session |
| `pomoMode` | `'focus' \| 'short'` | The currently active mode |
| `pomoCurrentCycle` | `number` | The cycle number the user is on (1-indexed) |
| `pomodorIntervalId` | `number \| null` | The `setInterval` handle; cleared on pause/stop |

### Tick Loop
The timer uses a `setInterval` called every `1000ms`. On each tick:
1. `pomoTimeLeft` is decremented by 1.
2. `updatePomoDisplay()` is called to update the ring, time display, and cycle count.
3. If `pomoTimeLeft === 10`, `playTick()` fires the 10-second warning beep.
4. If `pomoTimeLeft === 0`, `playRing()` fires the alarm and `setPomoMode()` transitions to the next mode.

---

## 2. Configurable Settings

Exposed via a collapsible `<details>` panel labeled "⚙️ Timer Settings":

| Input | ID | Default | Description |
|---|---|---|---|
| Focus Duration | `#pomoFocusMin` | 50 min | Length of each focus session |
| Break Duration | `#pomoShortMin` | 10 min | Length of each short break |
| Total Duration | `#pomoTotalHours` | 4 hrs | Total study block length |

### Dynamic Cycle Computation
Total cycles are recalculated every time a setting changes:
```js
function getTotalCycles() {
    const totalMin = parseFloat(pomoTotalHours.value) * 60;
    const cycleMin = parseInt(pomoFocusMin.value) + parseInt(pomoShortMin.value);
    return Math.max(1, Math.floor(totalMin / cycleMin));
}
```
**Example**: 45 min focus + 15 min break + 4 hr total → `240 / 60 = 4 cycles`

The "Current Cycle" display (`X of Y`) always reflects the computed total — no hardcoded limits.

---

## 3. Mode-Based Theming

When `setPomoMode(mode)` is called, it adds a CSS class to `#pomodoroView`:

| Mode | CSS Class | Visual Effect |
|---|---|---|
| Focus | `mode-focus` | Glass card gets a subtle **red border + red background tint** |
| Break | `mode-short` | Glass card gets a subtle **green border + green background tint** |

In **fullscreen mode**, the theming extends to a full radial-gradient covering the entire black background:
- Focus: `radial-gradient(circle at center, rgba(239, 68, 68, 0.1) ...)`
- Break: `radial-gradient(circle at center, rgba(52, 211, 153, 0.15) ...)`

---

## 4. Fullscreen Mode

### Entering / Exiting
- **Enter**: Click the pill-shaped "Enter Full Screen" button below the Timer Settings panel.
- **Exit**: Tap the `fa-compress` button on the right side of the floating controls bar, OR press `Esc`.

### Floating Controls Bar (`#pomoFullscreenControls`)
The controls bar is positioned `fixed` at the bottom of the screen, centered horizontally. Its layout from left to right:

```
[ 1 of 4 ]  [ ↩ Reset ]  [ ▶ Play ]  [ ⏭ Skip ]  [ ⛶ Exit ]
```

### Auto-Fade State Machine
The controls auto-hide after 3 seconds of inactivity using a 3-state system:

| Action | Effect |
|---|---|
| `mousemove` / `touchmove` | Calls `resetFsIdle()` — shows controls and resets 3s timer |
| Tap while controls **visible** | Hides controls immediately |
| Tap while controls **hidden** | Shows controls and starts 3s idle timer |

### Swipe Lock
While `document.fullscreenElement` is truthy, the global Instagram-swipe `touchstart` handler exits early. **This prevents accidental tab changes while the user is studying in fullscreen.**

### Elements Hidden in Fullscreen
Using `display: none !important` via both `:fullscreen` and `:-webkit-full-screen` selectors:
- `.modal-header` (title bar)
- `.pomo-settings-details` (settings panel)
- `.pomo-mode-bar` (mode selector)
- `.pomo-sessions` (cycle counter panel)
- `.btn-fullscreen-inline` (the "Enter Full Screen" pill button)
- `.pomo-controls` (standard play/pause controls)
- `.top-bar` and `#bottomNav`

---

## 5. Screen Wake Lock

The timer prevents the device screen from sleeping during active sessions via two complementary strategies:

### Strategy 1 — Screen Wake Lock API (Standard)
```js
wakeLock = await navigator.wakeLock.request('screen');
```
Works on: Android Chrome, Desktop Chrome/Edge.

### Strategy 2 — Silent Video Fallback (iOS Safari)
A tiny `<video>` element with a base64-encoded WebM source (essentially 1 frame) is injected into `<body>` on first timer start:
```js
noSleepVideo.src = 'data:video/webm;base64,...';
noSleepVideo.setAttribute('muted', '');
noSleepVideo.setAttribute('loop', '');
noSleepVideo.play();
```
This triggers the platform's "media is playing" signal, keeping the display awake on iOS. The video is hidden (`display: none`) and fully silent.

Both strategies are released when the timer is stopped or reset.

---

## 6. Audio System

All audio is synthesized via the **Web Audio API** — no audio files are loaded.

### 10-Second Warning (`playTick`)
- **Waveform**: Triangle
- **Frequency**: 600 Hz
- **Pattern**: Two short pulses (0s and 0.5s offset)
- **Volume**: 0.1 gain, fades to 0 in 100ms

### Session-End Alarm (`playRing`)
- **Waveform**: Square
- **Frequency**: 800 Hz
- **Pattern**: Six rapid pulses (at 0, 0.2, 0.4, 0.8, 1.0, 1.2 seconds)
- **Volume**: 0.15 gain, fades to 0 in 150ms

---

## 7. Key HTML Elements

| Element ID | Role |
|---|---|
| `#pomodoroView` | Root view container; receives `mode-focus`/`mode-short` classes |
| `#pomoTime` | Main time display (e.g., `50:00`) |
| `#pomoModeLabel` | Small "Focus" / "Break" label under the time |
| `#pomoRingFill` | SVG circle progress ring |
| `#pomoSessionCount` | "Current Cycle" text (e.g., `1 of 4`) |
| `#pomoFullscreenControls` | Floating controls bar (fullscreen only) |
| `#fsCycleText` | Cycle counter inside floating controls |
| `#btnFsPlayPause` | Floating Play/Pause button |
| `#btnFsPrev` | Floating Reset button |
| `#btnFsSkip` | Floating Skip button |
| `#btnFsExit` | Floating Exit Fullscreen button |
| `#btnPomoFullscreen` | "Enter Full Screen" pill button (normal mode only) |
| `#pomoMiniTimer` | Floating mini-timer widget (shown on other tabs while running) |

---

*Last updated: 2026-04-14 (v2.2)*
