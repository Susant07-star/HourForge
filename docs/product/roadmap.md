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

## 🔄 Sprint 1: MVP Stabilization
**Goal**: Solidify the foundation for multi-device sync and local reliability.

- **Infrastructure**: Complete the **Supabase Realtime** migration for all tables.
- **Deep Merge Engine**: Finalize and unit-test the `id` + `updated_at` merge logic (Zero data loss).
- **Study Timer**: Build the "Start/Stop" study companion UI on the Home tab.
- **AI Core**: Implement the 1-2 line "Short Feedback" rules in `charts.js`.

## 3. Sprint 2: Beta Launch & UX Polish (Weeks 3–4)
**Goal**: Launch as a PWA to initial beta testers and simplify navigation.

- **Navigation v3.0**: Move to the 5-Tab system (Home, Study, Revisions, Progress, Profile).
- **Revision Engine**: Full automation for 2nd, 4th, and 7th day revision scheduling.
- **PWA Polish**: Ensure offline usage for at least 7 days without a server connection.
- **Onboarding**: Create the "Faculty Selection" and "Exam Countdown" first-time experience.

## 4. Sprint 3: Growth & Mastery (Weeks 5–6)
**Goal**: Add features that drive long-term retention and potentially monetization.

- **Gamification**: Study Streaks (Visual fire icons) and "Points/Badges" for revision completion.
- **Gamified Subject Mastery**: Visualizing "Levels" for each subject based on study hours and revision scores.
- **Social Companion (Beta)**: Minimal leaderboard or "Friend Sync" for group study accountability.
- **Premium Tier Prep**: Gating AI insights and advanced analytics for Pro users.

## 5. Future 🗺️ (Post-Sprint 3)
- **Voice Commands**: "Start Study" via Google Assistant/Siri.
- **Desktop Widgets**: Native OS integration for the focus timer.
- **Advanced AI Mentoring**: Voice-enabled AI coaching using LLM audio APIs.
- **Pomodoro Session Logging**: Auto-log completed Pomodoro sessions into the Study Log table.
- **Multiple Profiles**: Support for shared devices (family/group academic use).

---
*Roadmap updated: v2.2 release, April 2026.*
