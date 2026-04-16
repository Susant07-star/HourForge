# 📜 Project Changelog

## [2.3.0] - 2026-04-16

### Changed — Premium SaaS UI Overhaul
- **Global Design System**: Replaced the legacy "Deep Space" galaxy background with a disciplined `slate-950` dark theme. Added centralized `@layer components` in `src/input.css` defining `.premium-card`, `.premium-input`, `.premium-btn-primary`, and `.premium-btn-secondary`.
- **Dashboard Tab**: Converted all stat widgets, the "Add Session" form, the AI Insight card, and the 5-Minute Anti-Procrastination timer to strict `.premium-card` grid containers using consistent `gap-6` rhythm.
- **Table View Tab**: Standardized the log table filter bar and table header into a unified `.premium-card` layout with correct `rounded-2xl` and `shadow-lg` depth.
- **Time Tracker Tab**: Refactored to a 1/3-to-2/3 responsive grid — log form on the left, history feed on the right — both using `.premium-card` constraints.
- **AI Insights Tab**: Rebuilt the chart container and AI feedback section using premium typography (`premium-heading` + `premium-subtext`) and consistent visual hierarchy.
- **Pomodoro Timer Tab**: Migrated from legacy `.glass-panel` to `.premium-card`. Added page heading/subtext, polished mode selector pill, upgraded settings collapsible with icon header. Enlarged timer ring (220px → 240px) with a glowing `drop-shadow`. Upgraded play/back/skip control buttons to slate-800 with `hover:-translate-y-1` interaction.

### Fixed
- **Pomodoro Ring Math Bug**: Replaced hardcoded `339.29` circumference constant with a dynamic calculation: `2 * Math.PI * r`, reading the `r` attribute from the DOM. This prevents ring offset failures if the SVG radius is ever changed.
- **Pomodoro Break Color**: Updated break mode ring stroke to the correct `#10b981` (emerald-500) instead of the old `#34d399`.

### UI — Modals & Overlays
- **Profile Settings Drawer**: Redesigned with `bg-slate-900/95 backdrop-blur-xl`, `rounded-t-[2.5rem]`, `.premium-input` on all form controls, and `.premium-btn-primary` submit button.
- **Info / About Modal**: Replaced legacy `.modal-box .info-modal` with a responsive `.premium-card` featuring a sticky header, feature grid cards with color-coded icons, numbered step cards, and a privacy callout.

### JS — Dynamic Element Updates
- **`timeTracker.js`**: History feed cards now render `.premium-card` structures with standardized action buttons.
- **`dashboard.js`**: JS-injected revision/session cards inherit the new component token system.

### Docs Updated
- `docs/dev/CHANGELOG.md` — This entry.
- `docs/ui/ux-flows.md` — Noted premium SaaS design overhaul under UI Design section.

---

## [2.2.0] - 2026-04-14

### Added
- **YouTube-Style Fullscreen Mode**: Dedicated full-screen Pomodoro experience. Controls float at the bottom with auto-fade (3-second idle timer). Tap to toggle controls on/off.
- **Floating Controls Layout**: Cycle counter (`X of Y`) placed on the left of the floating bar; Exit Fullscreen (`fa-compress`) button on the right. Play/Pause, Reset, and Skip keep center.
- **Fullscreen Swipe Lock**: Horizontal tab-swipe is completely disabled while the app is in fullscreen mode, preventing ghost tab changes behind the timer.
- **Mode-Based Background Theming**: `#pomodoroView` receives `mode-focus` or `mode-short` class when `setPomoMode()` is called. Focus = red glow on the glass card; Break = green glow. Works in both normal and fullscreen.
- **iOS Wake Lock Fallback**: A silent, muted, looping `<video>` element (base64 WebM) is injected and played alongside `navigator.wakeLock` to prevent iOS Safari from sleeping during sessions.
- **Dynamic Cycle Count**: `getTotalCycles()` dynamically computes total cycles from user-entered focus/break/duration values. Works for any arbitrary combination (e.g., 44 min focus + 12 min break).
- **Crisp Audio Alerts**: `playTick()` uses Triangle wave at 600 Hz (10-second warning); `playRing()` uses Square wave bursts at 800 Hz (session-end alarm).
- **Enter Full Screen Button**: Inline pill button placed between the Timer Settings collapsible and the SVG ring. Automatically hidden inside fullscreen via CSS.
- **Bottom Margin for Current Cycle**: Added mobile-specific bottom margin on `.pomodoro-panel` so "Current Cycle" text is never covered by the bottom navigation bar.

### Fixed
- **Ghost "25-Minute" Timer Bug**: Completely removed the legacy `POMO` object (200+ lines) from `script.js`. Two timer engines were running simultaneously; now there is exactly one.
- **Fullscreen Bottom Margin Bleed**: Added `margin: 0 !important` and `padding: 0 !important` to `.pomodoro-panel` inside both `:fullscreen` and `:-webkit-full-screen` selectors to prevent mobile bottom-margin from pushing the timer off-center.
- **Mobile Tap Not Registering**: Added `-webkit-tap-highlight-color: transparent` and `cursor: pointer` on `#pomodoroView:fullscreen` so iOS/Chrome mobile registers clean tap events to toggle the floating controls.
- **Tab Swipe in Fullscreen**: Added `if (document.fullscreenElement) return;` guard at the top of the `touchstart` event in the Instagram swipe IIFE.

### Performance
- **Reduced Blur Intensity**: Global `.glass-panel` blur reduced from `16px` → `8px`. Mobile-specific override reduced from `6px` → `4px` with box-shadows disabled to reduce GPU overdraw on older phones.
- **Background Animation Disabled on Mobile**: `body::before` and `body::after` animated orbs have `animation: none` on mobile to eliminate the main source of scroll jank.
- **Service Worker Cache**: Bumped to `hourforge-v28` to force hard-refresh of all cached assets.

### Docs Updated
- `README.md` — Updated feature table, roadmap, and version badge to v2.2.
- `DEVELOPER.md` — Added full Pomodoro Timer Architecture section with state map, Wake Lock strategy, audio system, and Fullscreen UX state machine.
- `docs/dev/CHANGELOG.md` — This entry.
- `docs/dev/known-issues.md` — Resolved the ghost timer issue.
- `docs/features/pomodoro-timer.md` — Created new dedicated feature document.

---

## [1.0.0] - 2026-03-27

### Added
- **Real-time Study Timer**: New "Start/Stop Study" engine in logic.
- **Automated Spaced Repetition**: Auto-scheduling of 2-4-7 day revisions.
- **Supabase Cloud Interface**: Real-time sync with PostgreSQL backend.
- **AI Performance Rating**: Initial Groq integration for weekly coaching.
- **Dashboard Widgets**: New "Psychology Insight" and "5-Min Timer" cards.

### Changed
- **Navigation Model**: Transitioned to 5-Tab system (Home, Study, Revisions, Progress, Profile).
- **Manual Logging Strategy**: Deprecated manual input in favor of Live Timer (but kept as backup).
- **Sync Logic**: Enhanced `deepMergeArrays` with stronger `id` + `updated_at` validation.

### Fixed
- **Time Overlap Bug**: Prevented sessions from being logged during overlapping periods.
- **Sync Loops**: Resolved multiple-device data oscillation issues.
- **Dark Mode UI**: Fixed low-contrast text in analytics dropdowns.

### Docs Updated (Documentation v3.0)
- `AI_CONTEXT.md` (Quick-start for AI).
- `core/architecture.md` (System map).
- `core/data-flow.md` (Diagrams).
- `core/sync-strategy.md` (Deep merge).
- `core/state-management.md` (State analysis).
- `core/data-models.md` (JSON structures).
- `features/time-tracking.md` (New flow).
- `features/revision-system.md` (2-4-7 logic).
- `features/ai-insights.md` (Coaching loop).
- `ui/navigation.md` (Tab definitions).
- `ui/ux-flows.md` (Daily loop).
- `api/supabase.md` (Schema definition).
- `api/ai-prompts.md` (Optimized Groq prompts).
- `dev/coding-rules.md` (Strict standards).
- `dev/known-issues.md` (Technical debt catalog).
- `dev/refactor-plan.md` (Migration roadmap).
- `dev/CONTRIBUTION_RULES.md` (AI/Human guidelines).
- `dev/CHANGELOG.md` (Initial tracking).

---
*The changelog is updated with every feature release or documentation sync.*
