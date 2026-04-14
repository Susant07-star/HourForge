# 🧭 Navigation Structure

## 1. The UX Strategy
HourForge uses a **Tab-Based Bottom Navigation** for touch-first efficiency. The app is moving from a complex, feature-heavy nav to a streamlined 5-tab system for the "Study Companion" experience.

## 2. NEW Tab Structure (v3.0+)

| Tab Name | Routing ID | Core Purpose |
| :--- | :--- | :--- |
| **🏠 Home** | `homeView` | Daily Overview, Streak, Study Insights, and Today's Summary. |
| **⏱️ Study** | `studyView` | **The New Hub.** Real-time timer, Start/Stop study actions, and immediate logging. |
| **🧠 Revisions** | `revisionsView` | Spaced Repetition center (Due Today, Overdue, and Upcoming tasks). |
| **📊 Progress** | `progressView` | Advanced Analytics, Chart.js trends, and historical performance charts. |
| **👤 Profile** | `profileView` | User settings, Supabase Auth status, and student profile configuration. |

## 3. Secondary Navigation (Drawers & Modals)
Complex actions are moved out of the main navigation path into contextual overlays:
- **Settings Modal**: Accessed from the Profile tab.
- **AI Feedback Drawer**: Contextual pop-up appearing after a study session or from the Home tab's feedback widget.
- **Manual Log Trigger**: Hidden behind a small "Add Backup Log" button inside the Study tab.

## 4. UI Layout Rules
- **View Toggling**: Handled by `switchTab(viewID)`. Only one view is `.active` at a time.
- **Stacking Order**:
  - `Body`: The main tab content.
  - `Bottom Nav`: Fixed at the bottom of the viewport.
  - `Overlay Layer`: Modals, dialogs, and progress loaders (fixed and above all else).
- **Z-Index Strategy**:
  - Tabs: `z-index: 10`
  - Navigation: `z-index: 50`
  - Modals/Drawers: `z-index: 100+`

## 5. View States
Every view must support the following states:
1. **Empty State**: No data (e.g., "No study logged today").
2. **Logged-Out State**: Minimal features + Auth prompt.
3. **Active/Loading State**: Transitions and skeleton loaders for data fetching.

---
*Navigation should be immediate. The student should never be more than 2 taps away from starting a study session.*
