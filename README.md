<div align="center">

# 🧠 HourForge

### Master Your Memory with the **2-4-7 Spaced Repetition Method**

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-GitHub_Pages-6366f1?style=for-the-badge)](https://susant07-star.github.io/HourForge/)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)
[![Made with](https://img.shields.io/badge/Made_with-HTML_|_CSS_|_JS-f59e0b?style=for-the-badge)](#)
[![AI Powered](https://img.shields.io/badge/AI-Groq_API-ec4899?style=for-the-badge)](#)
[![Version](https://img.shields.io/badge/Version-2.2-a855f7?style=for-the-badge)](#)

A personal academic productivity web app that helps students study smarter — combining **spaced repetition**, **time logging**, and **AI-powered coaching** in one beautiful, offline-capable interface.

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| ⏱️ **Time Tracker** | Automated study logging synced with the timer; manual backfill available as a secondary option |
| 🛡️ **Fair-Play System** | Anti-cheating logic that rewards real focus time while rejecting "farming" sessions |
| 🤖 **AI Insights** | Daily, weekly, and monthly mentor-level feedback via Groq AI |
| 📊 **Progress Charts** | Visual breakdown of study hours, subject distribution, peak hours & revision rate |
| ⏱️ **Pomodoro Timer** | Fully configurable focus/break cycles with SVG ring progress, YouTube-style fullscreen mode, mode-based background themes (red = focus, green = break), crisp digital audio alerts, dynamic cycle tracking, screen Wake Lock, and iOS no-sleep fallback |
| 🌙 **Screen Always-On** | Keeps the display on during all timer sessions using the Screen Wake Lock API with a silent video fallback for iOS Safari |
| 📵 **Fullscreen Mode** | Dedicated full-screen Pomodoro experience with auto-hiding floating controls bar (tap to toggle), cycle counter on the left, exit button on the right — swipe-to-change-tab is disabled in this mode |
| 🎯 **Exam Countdown** | Set up to 2 upcoming exam dates and see a live countdown on the dashboard |
| 🔥 **Study Streaks** | Daily streak tracking to keep you consistent and accountable |
| 👤 **Student Profiles** | Configure your grade, faculty, and subjects — app auto-fills relevant subjects |
| 💾 **Auto Backup** | Link a local folder and your data auto-saves — never lose your progress |
| 📤 **Export / Import** | Download your data as JSON or restore from a backup file at any time |
| ☁️ **Cloud Sync** | Sign in with Google to sync your data across devices via Supabase |
| 📱 **PWA Support** | Install HourForge as a native app on Android/iOS — works offline! |

---

## 🖥️ Screenshots

![HourForge Dashboard](screenshots/dashboard.png)

---

## 🚀 Live Demo

👉 **[Open HourForge →](https://susant07-star.github.io/HourForge/)**

No installation needed. Works directly in your browser.

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Charts:** [Chart.js](https://www.chartjs.org/) v4.4
- **Icons:** [Font Awesome](https://fontawesome.com/) v6.4
- **Fonts:** [Outfit](https://fonts.google.com/specimen/Outfit) — Google Fonts
- **AI:** [Groq API](https://console.groq.com/) (free tier — user provides their own key)
- **Storage:** `localStorage` (fully offline capable)
- **Hosting:** GitHub Pages

---

## 📖 How to Use

**1. Set Up Your Profile**
> Tap the **Profile** icon → Choose your grade & faculty → Subjects auto-fill. Add exam dates for a live countdown timer.

**2. Log What You Study**
> On the **Dashboard**, add a session with the subject, chapter/topic, and date. The app auto-schedules revision reminders at 2, 4, and 7 days.

**3. Do Your Daily Revisions**
> Check the **Due Today** panel each morning. Green ✅ = done. Orange ⏳ = revision due. Red 🔴 = overdue!

**4. Earn Your Hours**
> Go to the **Pomodoro** tab, pick a subject chip, and hit Play. Once the timer finishes, the app **automatically logs** your study credit to the Time Tracker tab.

**5. Get AI Feedback**
> Visit **AI Insights**, paste your free [Groq API key](https://console.groq.com/keys), and generate a daily/weekly/monthly mentor analysis of your habits on HourForge.

**6. Backup Your Data**
> Use the **Auto-Backup** button to link a local folder — data saves automatically in the background.

---

## 🏃 Run Locally

No build step required. Just open the file in any modern browser:

```bash
# Clone the repository
git clone https://github.com/Susant07-star/HourForge.git

# Navigate into the folder
cd HourForge

# Open in browser (double-click or use a local server)
# With VS Code Live Server:
# Right-click index.html → Open with Live Server
```

---

## 🤖 AI Setup (Optional)

HourForge uses the **Groq API** for AI-powered insights. It's completely free:

1. Go to [console.groq.com/keys](https://console.groq.com/keys) and sign up for free
2. Create an API key
3. Open **AI Insights** tab in HourForge
4. Paste your key and click **Save**
5. Click **Generate AI Insights** 🎉

> Your API key is stored **only in your browser** and never sent anywhere else.

---

## 📁 Project Structure

```
HourForge/
├── index.html          # Main app — all views (Dashboard, Hours, AI Insights)
├── css/                # Modular design system (layout, pomodoro, dashboard)
├── js/                 # Modular core logic
│   ├── pomodoro.js     # Timer engine & Automated logging
│   ├── timeTracker.js  # History management & Logging API
│   ├── charts.js       # AI analytics engine
│   └── store.js        # State & persistence
├── sw.js               # Service worker for offline PWA support
├── manifest.json       # PWA manifest
└── README.md           # You are here
```

---

## 🗺️ Roadmap

- [x] PWA support (installable as an app on Android/iOS)
- [x] Cloud sync (Google Auth + Supabase)
- [x] Pomodoro Timer with fully configurable focus/break cycles, cycle tracking, and dynamic total cycles calculation
- [x] Screen Wake Lock (display stays on during focus sessions, iOS fallback via silent video)
- [x] YouTube-style fullscreen Pomodoro mode (tap to toggle controls, auto-fade, swipe lock)
- [x] Mode-based background theming (focus = red glow, break = green glow)
- [x] PWA App Shortcuts (jump to Timer or Log from home screen icon)
- [ ] Multiple profile support (for families or shared devices)
- [ ] Weekly planner / goal-setting module
- [ ] More AI models support (Gemini, OpenAI)

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 For Developers & AIs

If you are a developer (or an AI assistant) looking to contribute, add features, or debug code, please read the **[Developer & AI Guide (DEVELOPER.md)](DEVELOPER.md)** first. It contains critical architectural context, sync logic rules, and debugging tips to save you time and prevent regressions.

---

<div align="center">

Built with ❤️ for students everywhere

**[⭐ Star this repo](https://github.com/Susant07-star/HourForge)** if HourForge helped you study smarter!

</div>
