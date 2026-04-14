# 📜 Project Changelog

## [1.0.0] - 2026-03-27 (Current Snapshot)

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
