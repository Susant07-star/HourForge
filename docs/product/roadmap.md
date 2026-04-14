# 📅 Product Roadmap

## 1. Overview
HourForge's development is structured in focused sprints, moving from a "Simple Tracker" to a "Discipline-First Companion."

---

## ✅ Completed — v2.2 (April 2026)
- **Pomodoro Timer**: Fully configurable focus/break engine with SVG ring, dynamic cycle tracking, and tab integration.
- **Fullscreen Mode**: YouTube-style fullscreen experience with tap-to-toggle floating controls bar and 3-second auto-fade.
- **Swipe Lock**: Tab swipe disabled in fullscreen; prevents ghost navigation behind the timer.
- **Mode-Based Theming**: Red glow for Focus, Green glow for Break — visible in both normal and fullscreen modes.
- **Screen Wake Lock + iOS Fallback**: Primary Screen Wake Lock API + silent video fallback for iOS Safari.
- **Crisp Audio**: Web Audio API synthesized alert tones (no external files).
- **Mobile Performance**: Reduced blur intensity globally; disabled animated background orbs on mobile GPU.
- **Service Worker**: Cache bumped to v28 for reliable updates on PWA installs.

---

## 🔄 Sprint 1: MVP Stabilization ✅
**Goal**: Solidify the foundation for multi-device sync and local reliability.

- ✅ Supabase Realtime migration for all tables.
- ✅ Deep Merge Engine with `id` + `updated_at` logic (zero data loss).
- ✅ Start/Stop study companion UI on the Home tab.
- ✅ 1-2 line short AI feedback rules in `charts.js`.

## 🔄 Sprint 2: Beta Launch & UX Polish ✅
**Goal**: Launch as a PWA to initial beta testers and simplify navigation.

- ✅ Navigation v3.0 — 5-Tab system.
- ✅ Full 2-4-7 revision automation.
- ✅ PWA offline support with Service Worker caching.
- ✅ Faculty Selection and Exam Countdown onboarding.

## 🏗️ Sprint 3: Growth & Mastery (Planned)
**Goal**: Add features that drive long-term retention and potentially monetization.

- [ ] **Gamification**: Study Streaks (fire icons), Points/Badges for revision completion.
- [ ] **Gamified Subject Mastery**: "Level" visualization per subject based on hours and revision scores.
- [ ] **Social Companion (Beta)**: Minimal leaderboard or "Friend Sync" for group accountability.
- [ ] **Premium Tier Prep**: Gate AI Insights and advanced analytics for Pro users.

---

## 5. Future 🗺️ (Post-Sprint 3)
- **Voice Commands**: "Start Study" via Google Assistant/Siri.
- **Desktop Widgets**: Native OS integration for the focus timer.
- **Advanced AI Mentoring**: Voice-enabled AI coaching using LLM audio APIs.
- **Pomodoro Session Logging**: Auto-log completed Pomodoro sessions into the Study Log table.
- **Multiple Profiles**: Support for shared devices (family/group academic use).

---
*Roadmap updated: v2.2 release, April 2026.*
