/**
 * HOURFORGE - MAIN ENGINE (script.js)
 * =========================================================================
 * ⚠️ DEVELOPER & AI NOTICE ⚠️
 * Before modifying this file, please read DEVELOPER.md in the root directory.
 * AI DIRECTIVE: If you modify the core architecture or the Storage Schemas below, 
 * you MUST update this Table of Contents, the JSDocs, AND DEVELOPER.md to reflect your changes.
 * 
 * This file is monolithic. Use this Table of Contents to navigate:
 * 
 * [1] Environment & Global State (Profile, Colors, Arrays)
 * [2] IndexedDB Wrapper (idb) - Heavy Object Storage
 * [3] Supabase Data Sync (Deep Merge Strategy) & Auth
 * [4] App Initialization (init(), Streaks, Exam Countdowns)
 * [5] Mobile Navigation (Instagram-style Drag Swipe)
 * [6] Modals & UI Toggles
 * [7] Dashboard Render Logic (renderTodayRevisions, Topics)
 * [8] Time Tracking Logic (renderTimeLogs, Metrics)
 * [9] CRUD Functions (addTimeLog, addStudySession)
 * [10] Pomodoro Timer System
 * [11] Local Backup / Export System
 * =========================================================================
 */

// ==========================================
// ERROR TRACKING (Sentry)
// ==========================================
if (typeof Sentry !== 'undefined') {
    Sentry.init({
        dsn: "https://5434c8fc905e9805887e8d156ecdfab6@o4508930847952896.ingest.us.sentry.io/4508930850705408",
        // The basic CDN bundle does not include Tracing/Replay by default, so we remove those integrations to prevent the 'not a function' error.
    });
}

// ==========================================
// STUDENT PROFILE SYSTEM
// ==========================================

const FACULTY_PRESETS = {
    'Science': ['Physics', 'Chemistry', 'Maths', 'Computer', 'English', 'Nepali'],
    'Management': ['Accountancy', 'Business Studies', 'Economics', 'Marketing', 'English', 'Nepali'],
    'Humanities': ['Sociology', 'History', 'Political Science', 'Psychology', 'English', 'Nepali'],
    'Education': ['Pedagogy', 'Child Psychology', 'Health & Physical Education', 'English', 'Nepali'],
    'Law': ['Constitutional Law', 'Criminal Law', 'Business Law', 'English', 'Nepali'],
    'Custom': []
};

// Dynamic color palette — auto-assigns colors to any subject list
const DYNAMIC_COLOR_PALETTE = [
    { css: '#818cf8', cssVar: 'var(--color-physics, #818cf8)' },
    { css: '#f472b6', cssVar: 'var(--color-chemistry, #f472b6)' },
    { css: '#fb923c', cssVar: 'var(--color-maths, #fb923c)' },
    { css: '#34d399', cssVar: 'var(--color-computer, #34d399)' },
    { css: '#38bdf8', cssVar: 'var(--color-english, #38bdf8)' },
    { css: '#a78bfa', cssVar: 'var(--color-nepali, #a78bfa)' },
    { css: '#fbbf24', cssVar: '#fbbf24' },
    { css: '#f87171', cssVar: '#f87171' },
    { css: '#2dd4bf', cssVar: '#2dd4bf' },
    { css: '#c084fc', cssVar: '#c084fc' },
    { css: '#fb7185', cssVar: '#fb7185' },
    { css: '#4ade80', cssVar: '#4ade80' },
];

const DEFAULT_PROFILE = {
    name: '',
    grade: 'Class 12',
    faculty: 'Science',
    subjects: ['Physics', 'Chemistry', 'Maths', 'Computer', 'English', 'Nepali'],
    exam1Label: 'Pre-Board Exam',
    exam1Date: '2026-03-20',
    exam2Label: 'Final Board Exam',
    exam2Date: '2026-04-27',
    setupComplete: false
};

function getProfile() {
    try {
        const stored = JSON.parse(localStorage.getItem('studentProfile'));
        if (stored && stored.subjects && stored.subjects.length > 0) return stored;
    } catch (e) { }
    return { ...DEFAULT_PROFILE };
}

function saveProfile(profile) {
    localStorage.setItem('studentProfile', JSON.stringify(profile));
}

function getSubjects() {
    return getProfile().subjects || DEFAULT_PROFILE.subjects;
}

// Build dynamic color maps from current subjects
function buildSubjectColors() {
    const subjects = getSubjects();
    const colors = {};
    const chartColors = {};
    subjects.forEach((subj, i) => {
        const palette = DYNAMIC_COLOR_PALETTE[i % DYNAMIC_COLOR_PALETTE.length];
        colors[subj] = palette.cssVar;
        chartColors[subj] = palette.css;
    });
    return { colors, chartColors };
}

// Constants & State (dynamic)
let SUBJECT_COLORS = buildSubjectColors().colors;
let SUBJECT_CHART_COLORS = buildSubjectColors().chartColors;

// Timezone-safe local date string (YYYY-MM-DD) — avoids toISOString() UTC drift
function getLocalDateStr(d) {
    d = d || new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Check if a time log is a non-study activity (excluded from study charts)
function isNonStudyLog(log) {
    if (log.subject === 'Sleep') return true;
    const taskLower = (log.task || '').toLowerCase();
    return /\b(sleep|slept|nap|sleeping)\b/.test(taskLower);
}

