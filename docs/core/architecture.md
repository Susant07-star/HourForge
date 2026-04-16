# 🏗️ Core Architecture

## 1. System Overview
**HourForge (StudyTracker)** is a Single Page Application (SPA) designed with a "Thin-Client" approach for modern browsers. It is built as a **Progressive Web App (PWA)** to provide a native-like experience on mobile and desktop without a standard app store deployment.

## 2. SPA Structure
The application uses a **Monolithic Single Page** model:
- **`index.html`**: A single document containing all app views, dialogs, drawers, and overlays.
- **View Switching**: Views are toggled using the `switchTab(viewId)` function, which updates visibility via CSS classes (`.active`) and resets scroll positions.
- **State Management**: Application state is held in global arrays (e.g., `studySessions`, `timeLogs`) that are persistent in the browser's memory and synced to local storage.

## 3. PWA Behavior
- **Offline-First**: The `sw.js` Service Worker caches all core assets (`index.html`, `style.css`, `script.js`).
- **Caching Strategy**:
  - **Network-First**: For logic and view layers, ensuring students always get the latest bug fixes when online.
  - **Cache-First**: For static assets like logos and fonts.
- **Background Sync**: The app attempts to sync with Supabase Cloud whenever a network connection is detected, allowing students to study offline and sync later.

## 4. Module Responsibilities

### `script.js` (The Engine)
- **State Management**: Primary holder of all user activity data.
- **Sync System**: Handles the "Deep Merge" conflict resolution and Realtime Supabase communication.
- **UI Wiring**: Attaches event listeners to all interactive DOM elements.
- **Form Logic**: Validates and processes study session and time log submissions.

### `js/charts.js` (The Insights Engine)
- **Analytics**: Calculates and renders Chart.js visualizations (Study Trends, Subject Distribution, Peak Hours).
- **AI Orchestration**: Constructs prompts for the Groq API and processes JSON responses for performance scores.

### `style.css` (The Design System)
- **Theming**: Uses CSS variables for color tokens and glassmorphism transparency.
- **Layout**: Implements a custom "Horizontal Swipe" navigation system using absolute positioning and CSS transforms.
- **Responsiveness**: Grid and Flexbox layouts optimized for mobile-first usage.

## 5. Deployment Layer
- **Hosting**: GitHub Pages (Static site hosting).
- **Backend**: Supabase (PostgreSQL + Auth + Edge Cases).
- **AI**: Groq Cloud (Llama series for sub-second inference).

---
*Architecture follows the principle of "Reliable Minimalism" — no build steps, just robust Browser APIs.*
