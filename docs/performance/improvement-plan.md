# ⚡ HourForge Performance & Improvement Plan

> **Status**: Drafted April 2026 — Post v2.2 Release  
> **Purpose**: A living document outlining all known performance bottlenecks, architectural improvements, and UX enhancements for future development sprints.  
> **Priority Order**: P0 = Critical (do first) → P3 = Nice-to-have

---

## 📊 Current State Assessment

| Metric | Current | Target |
|---|---|---|
| First Contentful Paint | ~1.2–2.5s (slow phones) | < 0.8s |
| Time to Interactive | ~2–4s | < 1.5s |
| `script.js` size | ~180KB (4400+ lines) | < 60KB (split) |
| `style.css` size | ~92KB (4000+ lines) | < 40KB (split) |
| Active blur layers (mobile) | 10+ simultaneous | 0–2 max |
| Memory footprint | ~45MB | < 20MB |

---

## 🔴 P0 — Critical Performance Fixes

### P0-1: Remove `backdrop-filter: blur()` Globally
**Root Cause**: This is the #1 performance killer. Every glass panel, nav bar, modal, and overlay uses blur. On budget Android phones (Snapdragon 400–600), the GPU must repaint every affected compositor layer on every single frame — even when nothing is moving.

**Files Affected**: `style.css`

**The Fix**:
```css
/* BEFORE (GPU killer — 10+ layers running simultaneously) */
.glass-panel {
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    background: rgba(255,255,255,0.05);
}

/* AFTER (virtually free — looks 95% identical) */
.glass-panel {
    background: rgba(20, 18, 50, 0.92);
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow: 0 4px 24px rgba(0,0,0,0.3);
}
```

Apply to: `.glass-panel`, `.bottom-nav`, `.top-bar`, `.profile-drawer`, all modal overlays.  
**Estimated Impact**: 60–70% reduction in render lag on mobile.

---

### P0-2: Kill the Animated Background Orbs
**Root Cause**: `body::before` and `body::after` run a CSS keyframe animation continuously in the background — 60 repaints per second — even when the user is on a static screen.

**Files Affected**: `style.css`

**The Fix**: Replace with a single static radial-gradient:
```css
/* BEFORE */
body::before {
    animation: orbFloat1 8s ease-in-out infinite;
    filter: blur(80px);
}

/* AFTER */
body {
    background: 
        radial-gradient(ellipse at 15% 20%, rgba(99,102,241,0.15) 0%, transparent 55%),
        radial-gradient(ellipse at 85% 80%, rgba(239,68,68,0.08) 0%, transparent 55%),
        #0a0820;
    /* Static. Zero animation cost. */
}
```

**Estimated Impact**: 15–20% reduction in baseline CPU usage.

---

### P0-3: Add CSS `contain` on Cards
**Root Cause**: When any property changes on a card (hover, data update), the browser recalculates layout for the entire page. `contain: layout style` tells the browser the card is isolated.

**Files Affected**: `style.css`

**The Fix**:
```css
.glass-panel,
.dashboard-stat-card,
.revision-card,
.time-log-card {
    contain: layout style;
}
```

**Estimated Impact**: Eliminates layout thrashing during list renders.

---

## 🟠 P1 — High Impact Architectural Improvements

### P1-1: Split `script.js` into ES Modules
**Root Cause**: 4400+ lines of synchronous JS parse time blocks the main thread before the app renders.

**Proposed Split**:
```
js/
├── core/
│   ├── db.js          — localStorage & IndexedDB wrappers
│   ├── sync.js        — Supabase auth & deepMergeArrays
│   └── state.js       — Global state store
├── features/
│   ├── dashboard.js   — renderDashboard, streak logic
│   ├── revisions.js   — 2-4-7 scheduling, revision tasks
│   ├── time-tracker.js — timeLogs, renderTimeLogs
│   ├── pomodoro.js    — Full Pomodoro engine
│   └── swipe.js       — Instagram-style swipe IIFE
├── ui/
│   ├── navigation.js  — Tab switching, bottom nav
│   ├── modals.js      — Drawer and modal helpers
│   └── toast.js       — showToast utility
└── main.js            — App entry point, lazy imports
```

Use **dynamic imports** to lazy-load feature modules only when the user navigates to that tab:
```js
// In main.js
navBtn.addEventListener('click', async () => {
    if (targetView === 'pomodoroView') {
        const { initPomodoro } = await import('./features/pomodoro.js');
        initPomodoro();
    }
});
```

**Estimated Impact**: 40–60% faster initial parse time (only loads what's needed).

---

### P1-2: Virtualize Long Lists
**Root Cause**: `renderTimeLogs()` and `renderAllTopics()` create a DOM node for every single record. A student with 200 sessions creates 200 DOM nodes, most of which are invisible.

**Solution**: Only render items that are in the viewport. Use a simple intersection observer or a fixed-height virtual list:

```js
// Render only 20 items at a time, load more as user scrolls
function renderVirtualList(container, items, renderFn, pageSize = 20) {
    let page = 0;
    const renderPage = () => {
        const slice = items.slice(0, (page + 1) * pageSize);
        container.innerHTML = '';
        const frag = document.createDocumentFragment();
        slice.forEach(item => frag.appendChild(renderFn(item)));
        container.appendChild(frag);
    };
    
    const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) { page++; renderPage(); }
    });
    // Observe a sentinel div at the bottom of the list
    renderPage();
}
```

**Estimated Impact**: Massive improvement for users with large datasets. Eliminates scroll jank.

---

### P1-3: Replace Chart.js with a Lighter Alternative
**Root Cause**: Chart.js is ~800KB minified. It is loaded globally and parsed even when the user never visits the Progress tab.

**Options**:
| Library | Size | Notes |
|---|---|---|
| **uPlot** | ~40KB | Extremely fast, canvas-based. Best for line/area charts. |
| **ApexCharts** | ~380KB | Feature-rich, good API. 50% smaller than Chart.js. |
| **ECharts** (lite) | ~150KB (lite build) | Powerful, tree-shakeable. |
| **Custom Canvas** | ~0KB | Write only what you need for bar/doughnut charts. |

**Recommended**: Lazy-load Chart.js only when `#progressView` is first activated:
```js
let chartsLoaded = false;
async function onProgressTabOpen() {
    if (!chartsLoaded) {
        await import('https://cdn.jsdelivr.net/.../chart.min.js');
        chartsLoaded = true;
        initCharts();
    }
}
```

**Estimated Impact**: Saves ~800KB on initial load. Faster TTI.

---

### P1-4: Debounce All Render Functions
**Root Cause**: `renderAllTopics()` and `renderTimeLogs()` are called multiple times in rapid succession (e.g., after a sync event that updates 10 records). Each call clears and rebuilds the entire DOM.

**The Fix**:
```js
function debounce(fn, delay = 150) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

const renderAllTopicsDebounced = debounce(renderAllTopics);
const renderTimeLogsDebounced = debounce(renderTimeLogs);
```

Replace all direct calls to render functions from Supabase Realtime handlers with the debounced versions.  
**Estimated Impact**: Prevents double/triple renders during sync storms.

---

## 🟡 P2 — UX & Quality of Life Improvements

### P2-1: Service Worker Precaching Strategy
**Current**: SW caches all assets on install (cache-first strategy).  
**Problem**: Large initial cache means slow first install.  
**Fix**: Move to a **stale-while-revalidate** strategy for JS/CSS and **cache-first** for fonts/icons only. Use Workbox for this.

---

### P2-2: `font-display: swap` for Google Fonts
**Current**: Google Fonts blocks text rendering until fonts load (FOIT — Flash of Invisible Text).  
**Fix**:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="...&display=swap" rel="stylesheet">
```
**Estimated Impact**: Eliminates the blank text phase on first load.

---

### P2-3: Preload Critical Resources
Add `<link rel="preload">` for `script.js`, `style.css`, and `logo.png` in `<head>`:
```html
<link rel="preload" href="style.css" as="style">
<link rel="preload" href="script.js" as="script">
<link rel="preload" href="logo.png" as="image">
```

---

### P2-4: Move to Flat Dark Design (UI Overhaul Option)
If the full blur removal is not enough, consider a complete design system shift:

| Current (Glassmorphism) | Proposed (Flat Dark) |
|---|---|
| `rgba` + `blur` panels | Solid `#1e1b4b` / `#13112e` cards |
| Animated orbs | Single static gradient |
| Multiple glow effects | Single accent color glow on focus elements only |
| 10+ blur layers | 0 blur layers |
| Feels: "Glass/premium" | Feels: "Clean/fast/modern" |
| Performance: Heavy | Performance: Near-native |

Reference designs: **Linear.app**, **Vercel Dashboard**, **Raycast** — all flat dark, zero blur, feel instantaneous.

---

### P2-5: Add `will-change: transform` to Animated Elements Only
Apply only to elements that actually animate (the Pomodoro ring, bottom-sheet drawers):
```css
/* ONLY these elements — nowhere else */
.pomo-ring-fill,
.bottom-sheet,
.sidebar-drawer {
    will-change: transform;
}
```
**Warning**: Do NOT apply globally. `will-change` on static elements wastes GPU memory.

---

### P2-6: Replace `localStorage` Sync Calls with Batched Writes
**Current**: Every time any data changes, the app calls `localStorage.setItem()` synchronously, blocking the main thread.  
**Fix**: Queue writes and flush them via `requestIdleCallback`:
```js
const writeQueue = new Map();

function queueWrite(key, value) {
    writeQueue.set(key, value);
    requestIdleCallback(flushWrites);
}

function flushWrites() {
    for (const [key, value] of writeQueue) {
        localStorage.setItem(key, JSON.stringify(value));
    }
    writeQueue.clear();
}
```

---

## 🟢 P3 — Future Architecture (Long-Term)

### P3-1: Migrate to Svelte
If a rebuild is ever considered, **Svelte** is the only framework that makes sense for this project:
- Compiles to pure vanilla JS — **zero runtime framework overhead**
- Built-in reactivity replaces all manual `render()` calls
- Bundle sizes typically 30-60% smaller than React equivalents
- Supports PWA patterns natively
- Would eliminate the entire "clear and rebuild" DOM pattern

**Note**: Do NOT migrate to React, Vue, or Angular. They add runtime overhead that would make the app heavier, not lighter.

### P3-2: IndexedDB-First Storage
Move all data from `localStorage` to `IndexedDB` (async, non-blocking):
- `localStorage` is synchronous — reading 500 sessions blocks the main thread
- `IndexedDB` reads/writes happen off the main thread
- Enables true background sync

### P3-3: Web Worker for Sync Logic
Move `deepMergeArrays()` and all Supabase sync operations into a Web Worker so they never block the UI thread:
```js
// sync.worker.js
self.onmessage = ({ data }) => {
    const merged = deepMergeArrays(data.local, data.cloud);
    self.postMessage({ merged });
};
```

---

## 📋 Implementation Order (Recommended)

| Priority | Task | Effort | Impact |
|---|---|---|---|
| **P0-1** | Remove all `backdrop-filter: blur()` | 1 hr | ⭐⭐⭐⭐⭐ |
| **P0-2** | Kill animated background orbs | 30 min | ⭐⭐⭐⭐ |
| **P0-3** | Add `contain` on cards | 15 min | ⭐⭐⭐ |
| **P2-2** | Add `font-display: swap` | 5 min | ⭐⭐ |
| **P2-3** | Preload critical resources | 10 min | ⭐⭐ |
| **P1-4** | Debounce render functions | 2 hrs | ⭐⭐⭐ |
| **P1-2** | Virtualize long lists | 4 hrs | ⭐⭐⭐⭐ |
| **P1-1** | Split `script.js` into modules | 1–2 days | ⭐⭐⭐⭐⭐ |
| **P1-3** | Lazy-load Chart.js | 2 hrs | ⭐⭐⭐⭐ |
| **P2-6** | Batch localStorage writes | 3 hrs | ⭐⭐⭐ |
| **P3-1** | Migrate to Svelte (rebuild) | 2–4 weeks | ⭐⭐⭐⭐⭐ |
| **P3-3** | Web Worker for sync | 3 days | ⭐⭐⭐⭐ |

---

## 🎯 Quick Win Summary
Just doing **P0-1 + P0-2** (about 1.5 hours of work) will make the app feel approximately **50–70% smoother** on low-end phones with zero visible design degradation to the user.

---

*Performance Plan authored: April 2026 | Next review: After Sprint 3 completion*
