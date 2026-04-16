
// ==========================================
// EXAM COUNTDOWN LOGIC
// ==========================================
function getExamDates() {
    const profile = getProfile();
    return {
        exam1: { label: profile.exam1Label || '', date: profile.exam1Date || '' },
        exam2: { label: profile.exam2Label || '', date: profile.exam2Date || '' }
    };
}

function updateExamCountdowns() {
    const preBoardEl = document.getElementById('preBoardCountdown');
    const boardEl = document.getElementById('boardCountdown');
    const exam1LabelEl = document.getElementById('exam1Label');
    const exam2LabelEl = document.getElementById('exam2Label');
    const countdownContainer = document.querySelector('.exam-countdown-container');

    if (!preBoardEl || !boardEl) return;

    const exams = getExamDates();

    // Update labels
    if (exam1LabelEl) exam1LabelEl.textContent = exams.exam1.label ? `${exams.exam1.label} in` : 'Exam 1 in';
    if (exam2LabelEl) exam2LabelEl.textContent = exams.exam2.label ? `${exams.exam2.label} in` : 'Exam 2 in';

    // If no exam dates at all, show '--'
    if (!exams.exam1.date && !exams.exam2.date) {
        preBoardEl.textContent = '--';
        boardEl.textContent = '--';
        return;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const calculateDaysRemaining = (examDateStr) => {
        if (!examDateStr) return null;
        const examDate = new Date(examDateStr);
        examDate.setHours(0, 0, 0, 0);
        const diffTime = examDate.getTime() - now.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    // Exam 1
    const daysToExam1 = calculateDaysRemaining(exams.exam1.date);
    if (daysToExam1 === null) {
        preBoardEl.textContent = '--';
    } else if (daysToExam1 > 0) {
        preBoardEl.textContent = daysToExam1;
        preBoardEl.style.color = daysToExam1 <= 7 ? '#ef4444' : '#f59e0b';
    } else if (daysToExam1 === 0) {
        preBoardEl.textContent = 'TODAY';
        preBoardEl.style.color = '#ef4444';
        preBoardEl.style.fontSize = '2rem';
    } else {
        preBoardEl.textContent = 'DONE';
        preBoardEl.style.opacity = '0.5';
    }

    // Exam 2
    const daysToExam2 = calculateDaysRemaining(exams.exam2.date);
    if (daysToExam2 === null) {
        boardEl.textContent = '--';
    } else if (daysToExam2 > 0) {
        boardEl.textContent = daysToExam2;
        boardEl.style.color = daysToExam2 <= 14 ? '#ef4444' : '#f59e0b';
    } else if (daysToExam2 === 0) {
        boardEl.textContent = 'TODAY';
        boardEl.style.color = '#ef4444';
        boardEl.style.fontSize = '2rem';
    } else {
        boardEl.textContent = 'DONE';
        boardEl.style.opacity = '0.5';
    }
}

// Initialize App
async function init() {
    try {
        // Attempt migration from old DB name if needed
        if (typeof migrateDatabaseIfNeeded === 'function') {
            await migrateDatabaseIfNeeded();
        }
    } catch (e) { console.warn('DB Migration skipped:', e); }

    try {
        // CRITICAL: Restore backup handle FIRST so recovery can use it
        if (typeof restoreAutoBackupSettings === 'function') {
            await restoreAutoBackupSettings();
        }
    } catch (e) { console.warn('Backup restore skipped:', e); }

    try {
        // Run data recovery before anything else renders 
        const recovered = await (typeof recoverDataIfNeeded === 'function' ? recoverDataIfNeeded() : Promise.resolve(null));
        if (recovered === 'indexeddb') {
            showToast('Data recovered automatically from backup! 🔄', 'success');
        } else if (recovered === 'backup-file') {
            showToast('Data recovered from your linked backup folder! 📂', 'success');
        }
    } catch (e) { console.warn('Data recovery skipped:', e); }

    // ---- UI RENDERING (always runs even if above steps fail) ----

    // Render dynamic subjects from profile
    renderDynamicSubjects();

    // Set today's date in form by default
    const today = getLocalDateStr();
    if (dateReadInput) dateReadInput.value = today;

    // Display current date in header gracefully
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    if (currentDateDisplay) currentDateDisplay.textContent = new Date().toLocaleDateString('en-US', options);

    // Start 1-minute interval to refresh UI (specifically for 5-min delete window & exam countdown)
    setInterval(() => {
        updateExamCountdowns();
        if (document.getElementById('dashboardView').classList.contains('active')) {
            renderAllTopics();
        } else if (document.getElementById('hourLogView').classList.contains('active')) {
            renderTimeLogs();
        }
    }, 60000);

    // Set default date for Time Tracker to today
    if (document.getElementById('timeDateInput')) document.getElementById('timeDateInput').value = getLocalDateStr();
    if (document.getElementById('historyDateFilter')) document.getElementById('historyDateFilter').value = getLocalDateStr();

    // Restore last active tab - HANDLED IN restoreSavedTab() BEFORE INIT
    // const savedTab = localStorage.getItem('activeTab');
    // if (savedTab && document.getElementById(savedTab)) {
    //     switchTab(savedTab, false);
    // } else {
    //     // Initial render (default to dashboard)
    //     renderDashboard();
    // }
    
    // Always render these as they might be needed by other tabs
    renderTableView();
    renderTimeLogs();
    
    // Frictionless Data Entry Initialization
    if (typeof autoFillSmartTimes === 'function') autoFillSmartTimes();
    if (typeof renderQuickActivityChips === 'function') renderQuickActivityChips();
    if (typeof renderIntelligentDurations === 'function') renderIntelligentDurations();

    // Premium Time/Date Pickers via Flatpickr
    // disableMobile: true FORCES Flatpickr's scroll-wheel UI on ALL devices (mobile AND desktop)
    // This prevents the native browser clock from ever appearing.
    if (typeof flatpickr !== 'undefined') {
        const timePickerConfig = {
            enableTime: true,
            noCalendar: true,
            dateFormat: 'H:i',       // Internal storage stays HH:mm for JS compatibility
            altInput: true,          // Show a friendly display value to the user
            altFormat: 'h:i K',      // What the USER sees: "1:30 PM" (No seconds!)
            time_24hr: false,
            enableSeconds: false,    // Explicitly disable seconds
            minuteIncrement: 1,      // Allow single minute adjustments (user feedback: 12:08 not 12:05)
            disableMobile: true,     // FORCE Flatpickr on mobile to prevent native clock (which might show seconds)
            onChange: function(selectedDates, dateStr, instance) {
                instance.element.value = dateStr;
                instance.element.dispatchEvent(new Event('input', { bubbles: true }));
            }
        };
        
        const startEl = document.getElementById('timeStartInput');
        const endEl = document.getElementById('timeEndInput');
        const dateEl = document.getElementById('timeDateInput');
        
        if (startEl && !startEl._flatpickr) flatpickr(startEl, timePickerConfig);
        if (endEl && !endEl._flatpickr) flatpickr(endEl, timePickerConfig);
        if (dateEl && !dateEl._flatpickr) {
            flatpickr(dateEl, {
                dateFormat: 'Y-m-d',
                altInput: true,
                altFormat: 'F j, Y',  // Shows "March 9, 2026"
                disableMobile: true,
                onChange: function(selectedDates, dateStr, instance) {
                    instance.element.value = dateStr;
                }
            });
        }
    }

    // Feature initializations
    updateExamCountdowns();
    if (typeof renderDailyInsight === 'function') renderDailyInsight();
    if (typeof calculateAndRenderStreak === 'function') calculateAndRenderStreak();

    // Event Listeners — only attach once
    if (addSessionForm && !addSessionForm.dataset.listenerAdded) {
        addSessionForm.addEventListener('submit', handleAddSession);
        addSessionForm.dataset.listenerAdded = 'true';
    }

    // Show profile modal on first visit
    const profile = getProfile();
    if (!profile.setupComplete) {
        setTimeout(() => showProfileModal(), 800);
    }
    
    console.log('✅ HourForge init complete!');
}

// ==========================================
// DYNAMIC SUBJECT RENDERING
// ==========================================
function renderDynamicSubjects() {
    const subjects = getSubjects();

    // Rebuild color maps
    const { colors, chartColors } = buildSubjectColors();
    SUBJECT_COLORS = colors;
    SUBJECT_CHART_COLORS = chartColors;

    // 1. Populate <select id="subject"> (Revision Tracker)
    const subjectSelect = document.getElementById('subject');
    if (subjectSelect) {
        // Keep the first "Select Subject..." option
        const firstOpt = subjectSelect.querySelector('option[disabled]');
        subjectSelect.innerHTML = '';
        if (firstOpt) subjectSelect.appendChild(firstOpt);
        subjects.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s;
            opt.textContent = s;
            subjectSelect.appendChild(opt);
        });
    }

    // 2. Populate <select id="timeSubjectInput"> (Time Tracker)
    const timeSubjectSelect = document.getElementById('timeSubjectInput');
    if (timeSubjectSelect) {
        const generalOpt = '<option value="">General / Other</option>';
        const sleepOpt = '<option value="Sleep">😴 Sleep</option>';
        timeSubjectSelect.innerHTML = generalOpt;
        subjects.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s;
            opt.textContent = s;
            timeSubjectSelect.appendChild(opt);
        });
        timeSubjectSelect.insertAdjacentHTML('beforeend', sleepOpt);
    }

    // 3. Populate filter buttons (Dashboard)
    const filterGroup = document.getElementById('subjectFilterGroup');
    if (filterGroup) {
        // Keep the "All" button
        const allBtn = filterGroup.querySelector('[data-filter="all"]');
        filterGroup.innerHTML = '';
        if (allBtn) filterGroup.appendChild(allBtn);
        subjects.forEach(s => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn bg-white/5 border border-white/10 text-slate-400 px-4 py-2 rounded-full font-medium font-sans text-[0.9rem] cursor-pointer transition-all hover:bg-white/10 hover:text-slate-200 [&.active]:bg-indigo-500 [&.active]:text-white [&.active]:border-indigo-500 [&.active]:shadow-sm';
            btn.dataset.filter = s;
            btn.textContent = s;
            btn.addEventListener('click', (e) => {
                filterGroup.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                currentFilter = s;
                renderAllTopics();
            });
            filterGroup.appendChild(btn);
        });
    }

    // 4. Populate subject tabs (Log Table)
    const tabsGroup = document.getElementById('subjectTabsGroup');
    if (tabsGroup) {
        tabsGroup.innerHTML = '';
        subjects.forEach((s, i) => {
            const btn = document.createElement('button');
            btn.className = `sub-tab px-6 py-4 bg-transparent border-b-4 border-transparent text-slate-400 font-medium whitespace-nowrap cursor-pointer transition-all hover:bg-white/5 hover:text-slate-200 outline-none ${i === 0 ? 'active' : ''}`;
            btn.dataset.subject = s;
            btn.textContent = s;
            if (i === 0) {
                btn.style.borderColor = `var(--color-${s.toLowerCase()})`;
                btn.style.color = `var(--color-${s.toLowerCase()})`;
                btn.style.backgroundColor = 'rgba(255,255,255,0.05)';
            }
            btn.addEventListener('click', (e) => {
                tabsGroup.querySelectorAll('.sub-tab').forEach(t => {
                    t.classList.remove('active');
                    t.style.borderColor = 'transparent';
                    t.style.color = '';
                    t.style.backgroundColor = 'transparent';
                });
                e.currentTarget.classList.add('active');
                e.currentTarget.style.borderColor = `var(--color-${s.toLowerCase()})`;
                e.currentTarget.style.color = `var(--color-${s.toLowerCase()})`;
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                currentTableSubject = s;
                renderTableView();
            });
            tabsGroup.appendChild(btn);
        });
        // Set initial table subject to first subject
        if (subjects.length > 0) currentTableSubject = subjects[0];
    }
}

// ==========================================
// INFO MODAL
// ==========================================
// ==========================================
// INFO MODAL (Removed in favor of Google Auth Gate)
// ==========================================
// Info Modal button was removed from the header.

// Close button (drawer)
document.getElementById('btnCloseProfile')?.addEventListener('click', closeProfileDrawer);

// Click overlay to close
document.getElementById('profileDrawerOverlay')?.addEventListener('click', closeProfileDrawer);

// Faculty change → auto-fill subjects and show/hide custom faculty input
document.getElementById('profileFaculty').addEventListener('change', (e) => {
    const faculty = e.target.value;
    const customInput = document.getElementById('profileCustomFaculty');

    // Show/hide custom faculty name input
    if (faculty === 'Custom') {
        customInput.style.display = 'block';
        customInput.focus();
        // Don't clear existing subjects for Custom — user adds their own
    } else {
        customInput.style.display = 'none';
        customInput.value = '';
        if (FACULTY_PRESETS[faculty] && FACULTY_PRESETS[faculty].length > 0) {
            _profileModalSubjects = [...FACULTY_PRESETS[faculty]];
            renderProfileSubjectTags();
        }
    }
});

// Add subject button
document.getElementById('btnAddSubject').addEventListener('click', () => {
    const input = document.getElementById('profileNewSubject');
    const val = input.value.trim();
    if (val && !_profileModalSubjects.includes(val)) {
        _profileModalSubjects.push(val);
        renderProfileSubjectTags();
        input.value = '';
    }
});

// Enter to add subject
document.getElementById('profileNewSubject').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('btnAddSubject').click();
    }
});

// Save profile
document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (_profileModalSubjects.length === 0) {
        showToast('Please add at least one subject.', 'warning');
        return;
    }

    // Determine faculty name (use custom text if Custom is selected)
    let facultyValue = document.getElementById('profileFaculty').value;
    const customFacultyVal = document.getElementById('profileCustomFaculty').value.trim();
    if (facultyValue === 'Custom' && customFacultyVal) {
        facultyValue = customFacultyVal;
    }

    const profileData = {
        name: document.getElementById('profileName').value.trim(),
        grade: document.getElementById('profileGrade').value,
        faculty: facultyValue,
        subjects: [..._profileModalSubjects],
        exam1Label: document.getElementById('profileExam1Label').value.trim(),
        exam1Date: document.getElementById('profileExam1Date').value,
        exam2Label: document.getElementById('profileExam2Label').value.trim(),
        exam2Date: document.getElementById('profileExam2Date').value,
        setupComplete: true,
        updatedAt: new Date().toISOString()
    };

    // Save to local storage for immediate offline access
    saveProfile(profileData);
    
    // Sync to Supabase user_data record if logged in
    if (currentSession && supabaseClient) {
        const btn = document.querySelector('.profile-save-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...';
        btn.disabled = true;

        await uploadDataToCloud();
            
        btn.innerHTML = originalText;
        btn.disabled = false;
        showToast('Profile saved and synced successfully! 🎓', 'success');
    } else {
        showToast('Profile saved locally! 🎓', 'success');
    }

    // Update UI elements dependent on profile state
    renderDynamicSubjects();
    renderDashboard();
    renderTableView();
    if (typeof renderTimeLogs === 'function') renderTimeLogs();
    
    // Attempt exam countdown update if available
    if (typeof updateExamCountdowns === 'function') {
        updateExamCountdowns();
    } else if (typeof updateExamCountdown === 'function') {
        updateExamCountdown();
    }

    closeProfileDrawer();
});

// Navigation — wired at top level (not inside init) to avoid timing issues
navBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        navBtns.forEach(b => b.classList.remove('active'));
        viewSections.forEach(v => v.classList.remove('active'));
        const targetViewId = btn.getAttribute('data-view');
        btn.classList.add('active');
        document.getElementById(targetViewId).classList.add('active');
        if (targetViewId === 'tableView') {
            renderTableView();
        } else if (targetViewId === 'hourLogView') {
            renderTimeLogs();
        } else {
            renderDashboard();
        }
    });
});
// Note: subTabs and filterBtns event listeners are now handled dynamically
// in renderDynamicSubjects() — the static handlers below are kept as fallback
// for any tabs/buttons that exist in static HTML
subTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
        subTabs.forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentTableSubject = e.currentTarget.dataset.subject;
        renderTableView();
    });
});

// Filter logic (fallback for static buttons, dynamic ones are handled in renderDynamicSubjects)
filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        filterBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentFilter = e.target.dataset.filter;
        renderAllTopics();
    });
});

/**
 * @typedef {object} RevisionState
 * @property {boolean} done - Whether the revision is completed.
 * @property {string|null} completedAt - ISO string of completion date, or null.
 */

/**
 * @typedef {object} StudySession
 * @property {string} id - Unique ID for the session.
 * @property {string} subject - The subject of the session.
 * @property {string} topic - The topic studied.
 * @property {string} dateRead - Date the topic was read (YYYY-MM-DD).
 * @property {string} createdAt - ISO string of when the session was created.
 * @property {{rev2: RevisionState, rev4: RevisionState, rev7: RevisionState}} revisions - Revision states.
 */

/**
 * @typedef {object} TimeLog
 * @property {string} id - Unique ID for the time log.
 * @property {string} task - Description of the task.
 * @property {string} subject - The subject of the task.
 * @property {string} startTime - Start time (HH:MM).
 * @property {string} endTime - End time (HH:MM).
 * @property {string} date - Date of the log (YYYY-MM-DD).
 * @property {string} [notes] - Optional notes for the log.
 * @property {string} createdAt - ISO string of when the log was created.
 */

// Persist data reliably using localStorage + IndexedDB mirror
function saveToLocalStorage() {
    localStorage.setItem('studySessions', JSON.stringify(studySessions));
    localStorage.setItem('timeLogs', JSON.stringify(timeLogs));
    // Auto-sync to Cloud implicitly on every save
    if (typeof uploadDataToCloud === 'function' && currentSession) {
        setTimeout(uploadDataToCloud, 500);
    }
}

// Form Submission Handler
function handleAddSession(e) {
    e.preventDefault();

    const subject = document.getElementById('subject').value;
    const topic = document.getElementById('topic').value.trim();
    const dateRead = document.getElementById('dateRead').value;

    if (!subject || !topic || !dateRead) return;

    const newSession = {
        id: Date.now().toString(), // Unique internal ID
        subject,
        topic,
        dateRead, // YYYY-MM-DD
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        revisions: {
            rev2: { done: false, completedAt: null },
            rev4: { done: false, completedAt: null },
            rev7: { done: false, completedAt: null }
        }
    };

    // Add to the front of our list
    studySessions.unshift(newSession);
    saveToLocalStorage();

    // Reset topic field so user can keep adding
    document.getElementById('topic').value = '';

    // Re-render immediately
    renderDashboard();
    renderTableView();

    // Trigger auto-backup if enabled
    autoBackupSync();
}

// Edit Time Log - Pre-fill form with log data for editing
function editTimeLog(id) {
    const logIndex = timeLogs.findIndex(l => l.id === id);
    if (logIndex === -1) return;

    const log = timeLogs[logIndex];

    // Check 5-minute window
    if (log.createdAt) {
        const diffMins = (Date.now() - new Date(log.createdAt).getTime()) / (1000 * 60);
        if (diffMins > 5) {
            alert("Edit window (5 minutes) has expired for this log.");
            renderTimeLogs();
            return;
        }
    }

    // Pre-fill the form with the log's current data
    document.getElementById('timeTaskInput').value = log.task;
    document.getElementById('timeSubjectInput').value = log.subject || '';
    
    // Default to the log's own start time
    document.getElementById('timeStartInput').value = log.startTime;
    
    // User Request: If editing the *latest* log (chronologically), 
    // the start time should ideally snap to the end time of the *previous* log (to fix gaps/mistakes).
    // Let's check if there is a previous log on the same date.
    const logsOnSameDate = timeLogs
        .filter(l => !l.deleted && l.date === log.date && l.id !== id) // Exclude self
        .sort((a, b) => b.endTime.localeCompare(a.endTime)); // Newest first
    
    if (logsOnSameDate.length > 0) {
        // The "latest" log before this one
        const previousLog = logsOnSameDate[0];
        // If the log being edited started *after* the previous one ended,
        // suggesting the previous end time might be helpful.
        // We only overwrite if the current start time seems "unaligned" or if user specifically asked for this behavior.
        // For now, let's prioritize the user's request: "start time should be set accroding to the last of already saved".
        // We will set it to the previous log's end time.
        document.getElementById('timeStartInput').value = previousLog.endTime;
    }

    document.getElementById('timeEndInput').value = log.endTime;
    document.getElementById('timeDateInput').value = log.date;
    const notesTextarea = document.getElementById('timeNotesInput');
    notesTextarea.value = log.notes || '';
    // Trigger auto-resize for textarea
    notesTextarea.style.height = 'auto';
    notesTextarea.style.height = notesTextarea.scrollHeight + 'px';

    // Remove the old log entry (Soft Delete)
    log.deleted = true;
    log.updatedAt = new Date().toISOString();
    // timeLogs.splice(logIndex, 1); // OLD hard delete
    
    saveToLocalStorage();
    renderTimeLogs();
    autoBackupSync();

    // Scroll to the form so user can edit and re-save
    document.getElementById('addTimeLogForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Time Log Deletion Logic (undo window)
function deleteTimeLog(id) {
    const logIndex = timeLogs.findIndex(l => l.id === id);
    if (logIndex === -1) return;

    const log = timeLogs[logIndex];
    if (!log.createdAt) return;

    if (confirm(`Are you sure you want to delete the time log for "${log.task}"?`)) {
        // SOFT DELETE: Mark as deleted so it syncs to cloud
        log.deleted = true;
        log.updatedAt = new Date().toISOString();
        
        // timeLogs.splice(logIndex, 1); // DO NOT SPLICE!
        
        saveToLocalStorage();
        renderTimeLogs();
        autoBackupSync();
        
        // Refresh smart autofill to update start time if the deleted log was the last one
        if (typeof autoFillSmartTimes === 'function') autoFillSmartTimes();
        // Also refresh chips as context might have changed
        if (typeof renderQuickActivityChips === 'function') renderQuickActivityChips();
    }
}

// Session Deletion Logic (undo window)
function deleteSession(id) {
    const sessionIndex = studySessions.findIndex(s => s.id === id);
    if (sessionIndex === -1) return;

    const session = studySessions[sessionIndex];
    if (!session.createdAt) return;

    const diffMins = (Date.now() - new Date(session.createdAt).getTime()) / (1000 * 60);

    if (diffMins <= 5) {
        if (confirm(`Are you sure you want to delete the log for "${session.topic}"?`)) {
            studySessions.splice(sessionIndex, 1);
            saveToLocalStorage();
            renderDashboard();
            renderTableView();
            autoBackupSync();
        }
    } else {
        alert("Delete window (5 minutes) has expired for this log. To wipe data completely, import an empty backup file.");
        renderDashboard(); // Re-render to clear the button
    }
}

// Permanent deletion for Revision Cards (no 5-min window restriction)
function deleteRevisionCard(event, id) {
    if (event) {
        event.stopPropagation();
        if (!confirm("Are you sure you want to delete this study session and its revision cycle?")) return;
    }

    const sessionIndex = studySessions.findIndex(s => s.id === id);
    if (sessionIndex === -1) return;

    // Soft Delete
    studySessions[sessionIndex].deleted = true;
    studySessions[sessionIndex].updatedAt = new Date().toISOString();
    // studySessions.splice(sessionIndex, 1);

    saveToLocalStorage();
    renderDashboard();
    renderTableView();
    autoBackupSync();
    
    if (typeof showToast === 'function') {
        showToast('Revision session deleted.', 'info');
    }
}


/**
 * Calculates strict day differences, dropping time components.
 */
function calculateDaysDifference(dateString1, dateString2) {
    const d1 = new Date(dateString1);
    d1.setHours(0, 0, 0, 0);

    const d2 = new Date(dateString2);
    d2.setHours(0, 0, 0, 0);

    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Return negative if d1 (read date) is logically ahead of d2 (today),
    // though generally d2 > d1 (read date is in past)
    if (d1 > d2) return -diffDays;
    return diffDays;
}

// 2-4-7 Logic Engine
function getRevisionsDueToday() {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0); // Normalize today's date to start of day
    const dueToday = [];

    // Helper to calculate days difference between two Date objects
    const getDaysDifference = (date1, date2) => {
        const d1 = new Date(date1);
        d1.setHours(0, 0, 0, 0);
        const d2 = new Date(date2);
        d2.setHours(0, 0, 0, 0);
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        return Math.round(diffTime / (1000 * 60 * 60 * 24));
    };

    studySessions.filter(s => !s.deleted).forEach(session => {
        // Migrate legacy boolean structure if necessary
        const rev2 = typeof session.revisions.rev2 === 'boolean' ? { done: session.revisions.rev2, completedAt: null } : session.revisions.rev2;
        const rev4 = typeof session.revisions.rev4 === 'boolean' ? { done: session.revisions.rev4, completedAt: null } : session.revisions.rev4;
        const rev7 = typeof session.revisions.rev7 === 'boolean' ? { done: session.revisions.rev7, completedAt: null } : session.revisions.rev7;

        if (rev2.done && rev4.done && rev7.done) return; // All revisions completed

        const baseDate = new Date(session.dateRead);
        baseDate.setHours(0, 0, 0, 0);

        // Determine which revision is next due and calculate its target date
        let targetRevisionType = '';
        let targetRevisionLabel = '';
        let referenceDate = null; // The date from which to count days for the next revision

        if (!rev2.done) {
            targetRevisionType = 'rev2';
            targetRevisionLabel = '2-Day Revision';
            referenceDate = baseDate; // Count 2 days from original read date
            const daysDiff = getDaysDifference(referenceDate, todayDate);
            if (daysDiff >= 2) {
                dueToday.push({ ...session, revisionType: targetRevisionType, revisionLabel: targetRevisionLabel, daysOverdue: daysDiff - 2 });
            }
        } else if (!rev4.done) {
            targetRevisionType = 'rev4';
            targetRevisionLabel = '4-Day Revision';
            // Count 4 days from when rev2 was completed. If no completedAt (legacy), use baseDate + 2 days.
            referenceDate = rev2.completedAt ? new Date(rev2.completedAt) : new Date(baseDate.getTime() + (2 * 24 * 60 * 60 * 1000));
            referenceDate.setHours(0, 0, 0, 0);
            const daysDiff = getDaysDifference(referenceDate, todayDate);
            if (daysDiff >= 4) {
                dueToday.push({ ...session, revisionType: targetRevisionType, revisionLabel: targetRevisionLabel, daysOverdue: daysDiff - 4 });
            }
        } else if (!rev7.done) {
            targetRevisionType = 'rev7';
            targetRevisionLabel = '7-Day Revision';
            // Count 7 days from when rev4 was completed. If no completedAt (legacy), use baseDate + 6 days.
            referenceDate = rev4.completedAt ? new Date(rev4.completedAt) : new Date(baseDate.getTime() + ((2 + 4) * 24 * 60 * 60 * 1000));
            referenceDate.setHours(0, 0, 0, 0);
            const daysDiff = getDaysDifference(referenceDate, todayDate);
            if (daysDiff >= 7) {
                dueToday.push({ ...session, revisionType: targetRevisionType, revisionLabel: targetRevisionLabel, daysOverdue: daysDiff - 7 });
            }
        }
    });

    return dueToday;
}

function renderDashboard() {
    renderTodayRevisions();
    renderAllTopics();
    if (typeof calculateAndRenderStreak === 'function') calculateAndRenderStreak();
}

// Fired when user clicks 'Mark Completed' on a revision card
function completeRevision(sessionId, revType) {
    const sessionIndex = studySessions.findIndex(s => s.id === sessionId);
    if (sessionIndex === -1) return;

    const session = studySessions[sessionIndex];

    // Ensure session structure is migrated to new format if it's old
    if (typeof session.revisions.rev2 === 'boolean') {
        session.revisions = {
            rev2: { done: session.revisions.rev2, completedAt: null },
            rev4: { done: session.revisions.rev4, completedAt: null },
            rev7: { done: session.revisions.rev7, completedAt: null }
        };
    }

    // Determine which revision to mark complete. Order matters.
    // This function is called with the specific revType that is due.
    // We update that specific revision.
    if (session.revisions[revType] && !session.revisions[revType].done) {
        session.revisions[revType] = { done: true, completedAt: new Date().toISOString() };
    } else {
        // If it's already done or revType is invalid, do nothing.
        return;
    }

    saveToLocalStorage();

    // Re-calculate and animate out
    renderDashboard();
    renderTableView();

    // Trigger auto-backup if enabled
    autoBackupSync();
}

// Inject Today's Cards
function renderTodayRevisions() {
    todayRevisionList.innerHTML = '';
    const dueToday = getRevisionsDueToday();
    const panel = document.getElementById('todayRevisionsPanel');
    const topSlot = document.getElementById('todayRevisionsSlot');
    const defaultHome = document.querySelector('.dashboard-section');

    if (dueToday.length === 0) {
        todayRevisionList.innerHTML = `
            <div class="col-span-full text-center py-12 px-4 text-slate-500 animated-entry">
                <i class="fa-solid fa-mug-hot text-5xl mb-4 opacity-50 block -mt-4"></i>
                <p>No 2-4-7 revisions strictly due today. Great job!</p>
            </div>
        `;
        // Move back to default position if it was in the top slot
        if (panel && defaultHome && panel.parentElement === topSlot) {
            defaultHome.insertBefore(panel, defaultHome.firstChild);
        }
        return;
    }

    // Revisions exist — move panel to the top slot (between AI Insight and Timer)
    if (panel && topSlot && panel.parentElement !== topSlot) {
        topSlot.appendChild(panel);
    }

    dueToday.forEach((session, index) => {
        const color = SUBJECT_COLORS[session.subject] || 'var(--accent-primary)';

        const card = document.createElement('div');
        card.className = 'bg-black/30 border border-white/10 rounded-2xl p-5 relative overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(0,0,0,0.3)] hover:border-white/20 animated-entry';
        card.style.setProperty('--card-color', color);
        card.style.animationDelay = `${index * 0.1}s`;

        let overdueBadge = '';
        if (session.daysOverdue > 0) {
            const label = session.daysOverdue === 1 ? 'day' : 'days';
            overdueBadge = `<span class="text-red-500 text-[0.8rem] font-semibold ml-2"><i class="fa-solid fa-circle-exclamation"></i> ${session.daysOverdue} ${label} overdue</span>`;
        }

        card.innerHTML = `
            <div class="absolute top-0 left-0 w-1 h-full bg-[var(--card-color)]"></div>
            <div class="text-[0.8rem] uppercase tracking-widest font-semibold mb-1 text-[var(--card-color)]">${session.subject}</div>
            <div class="text-[1.2rem] font-semibold mb-4 leading-snug text-slate-200">${session.topic}</div>
            <div class="flex flex-wrap justify-between items-center text-[0.9rem] text-slate-400 mb-4 gap-2">
                <span class="bg-pink-500/20 text-pink-200 px-3 py-1 rounded-full font-semibold text-[0.8rem] w-fit whitespace-nowrap">${session.revisionLabel}</span>
                ${overdueBadge}
                <span class="whitespace-nowrap"><i class="fa-regular fa-clock"></i> Read: ${session.dateRead}</span>
            </div>
            <button class="w-full mt-auto bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-2.5 rounded-xl cursor-pointer font-medium transition-all duration-200 flex justify-center items-center gap-2 hover:bg-emerald-500/20 hover:-translate-y-[1px]" onclick="completeRevision('${session.id}', '${session.revisionType}')">
                <i class="fa-solid fa-check"></i> Mark Completed
            </button>
        `;
        todayRevisionList.appendChild(card);
    });
}


// Inject All Topics List View
function renderAllTopics() {
    allTopicsList.innerHTML = '';

    let filteredSessions = studySessions.filter(s => !s.deleted);
    if (currentFilter !== 'all') {
        filteredSessions = filteredSessions.filter(s => s.subject === currentFilter);
    }

    if (filteredSessions.length === 0) {
        allTopicsList.innerHTML = `
            <div class="text-center py-12 px-4 text-slate-500 animated-entry">
                <p>No topics found. Log some sessions first!</p>
            </div>
        `;
        return;
    }

    const fragment = document.createDocumentFragment();
    filteredSessions.forEach((session, index) => {
        const color = SUBJECT_COLORS[session.subject] || 'var(--accent-primary)';
        const item = document.createElement('div');
        item.className = 'flex justify-between items-center p-4 border-b border-white/5 transition-colors duration-200 hover:bg-white/5 last:border-none animated-entry';
        item.style.animationDelay = `${index * 0.05}s`;

        // Visual indicators of step completion
        const rev2Done = session.revisions.rev2.done ?? session.revisions.rev2 === true;
        const rev4Done = session.revisions.rev4.done ?? session.revisions.rev4 === true;
        const rev7Done = session.revisions.rev7.done ?? session.revisions.rev7 === true;

        const rev2Class = rev2Done ? 'bg-emerald-500 text-white border-transparent' : 'bg-white/10 text-slate-400 border-white/10 opacity-50';
        const rev4Class = rev4Done ? 'bg-emerald-500 text-white border-transparent' : 'bg-white/10 text-slate-400 border-white/10 opacity-50';
        const rev7Class = rev7Done ? 'bg-emerald-500 text-white border-transparent' : 'bg-white/10 text-slate-400 border-white/10 opacity-50';

        const rev2Icon = rev2Done ? '<i class="fa-solid fa-check"></i>' : '2d';
        const rev4Icon = rev4Done ? '<i class="fa-solid fa-check"></i>' : '4d';
        const rev7Icon = rev7Done ? '<i class="fa-solid fa-check"></i>' : '7d';

        // Persistent Delete Button
        const deleteBtnHtml = `<button class="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-2.5 py-1 text-[0.75rem] transition-colors hover:bg-red-500/20 hover:text-red-300" title="Delete Ongoing Revision" onclick="deleteRevisionCard(event, '${session.id}')"><i class="fa-solid fa-trash-can"></i></button>`;

        item.innerHTML = `
            <div class="flex-1 pr-4">
                <div class="flex justify-between items-start mb-1 gap-2">
                    <h4 class="text-[1.1rem] font-medium text-slate-200 m-0">${session.topic}</h4>
                    ${deleteBtnHtml}
                </div>
                <div class="text-[0.85rem] text-slate-400 flex max-[480px]:flex-col max-[480px]:gap-1.5 md:gap-4 mt-2">
                    <span class="flex items-center gap-2 border border-white/10 px-2 py-0.5 rounded-md bg-black/20 w-fit">
                        <div class="w-2.5 h-2.5 rounded-full" style="background-color: ${color}"></div>
                        ${session.subject}
                    </span>
                    <span class="flex items-center gap-1.5"><i class="fa-regular fa-calendar"></i> ${session.dateRead}</span>
                </div>
            </div>
            <div class="flex gap-1.5 pl-2 border-l border-white/5">
                <div class="w-7 h-7 rounded-full flex items-center justify-center text-[0.75rem] cursor-help border transition-colors ${rev2Class}" title="2-Day">${rev2Icon}</div>
                <div class="w-7 h-7 rounded-full flex items-center justify-center text-[0.75rem] cursor-help border transition-colors ${rev4Class}" title="4-Day">${rev4Icon}</div>
                <div class="w-7 h-7 rounded-full flex items-center justify-center text-[0.75rem] cursor-help border transition-colors ${rev7Class}" title="7-Day">${rev7Icon}</div>
            </div>
        `;

        // Long-press on mobile (600ms hold) — alternative delete trigger for touch screens in Ongoing Revisions
        let longPressTimer;
        item.addEventListener('touchstart', (e) => {
            longPressTimer = setTimeout(() => {
                if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
                if (confirm(`Delete ongoing revision for "${session.topic}"?`)) {
                    deleteRevisionCard(null, session.id);
                }
            }, 600);
        }, { passive: true });
        item.addEventListener('touchend', () => clearTimeout(longPressTimer), { passive: true });
        item.addEventListener('touchmove', () => clearTimeout(longPressTimer), { passive: true });

        fragment.appendChild(item);
    });
    allTopicsList.appendChild(fragment);
}

// Render Excel-like Table View
function renderTableView() {
    revisionTableBody.innerHTML = '';

    // Filter by the currently selected subject tab in the table view
    const filteredSessions = studySessions.filter(s => !s.deleted && s.subject === currentTableSubject);

    if (filteredSessions.length === 0) {
        revisionTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-slate-400 py-12 px-4 border-b border-white/5">
                    <i class="fa-solid fa-folder-open text-[2rem] mb-4 opacity-50 block"></i>
                    No logs found for ${currentTableSubject}. Add a session to see it here.
                </td>
            </tr>
        `;
        return;
    }

    const fragment = document.createDocumentFragment();
    filteredSessions.forEach((session, index) => {
        const tr = document.createElement('tr');
        tr.className = 'animated-entry';
        tr.style.animationDelay = `${index * 0.05}s`;

        // Helper to format the status cells beautifully with date logic
        const getStatusCell = (session, revType) => {
            const revObj = typeof session.revisions[revType] === 'boolean'
                ? { done: session.revisions[revType], completedAt: null }
                : session.revisions[revType];

            if (revObj.done) {
                let dateHtml = '';
                if (revObj.completedAt) {
                    const dateObj = new Date(revObj.completedAt);
                    const shortDate = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                    dateHtml = `<div class="text-[0.65rem] font-medium mt-1 text-slate-400 whitespace-nowrap">${shortDate}</div>`;
                }
                return `
                    <div class="flex flex-col items-center justify-center gap-1">
                        <div class="w-9 h-9 rounded-full flex flex-col items-center justify-center m-auto text-[1rem] transition-all bg-[#10b981]/15 text-[#34d399] border border-[#10b981]/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]"><i class="fa-solid fa-check"></i></div>
                        ${dateHtml}
                    </div>
                `;
            } else {
                // Calculate pending predictive due date
                const baseDate = new Date(session.dateRead);
                baseDate.setHours(0, 0, 0, 0);
                const rev2 = typeof session.revisions.rev2 === 'boolean' ? { done: session.revisions.rev2, completedAt: null } : session.revisions.rev2;
                const rev4 = typeof session.revisions.rev4 === 'boolean' ? { done: session.revisions.rev4, completedAt: null } : session.revisions.rev4;

                let dueDate = null;
                if (revType === 'rev2') {
                    dueDate = new Date(baseDate.getTime() + (2 * 24 * 60 * 60 * 1000));
                } else if (revType === 'rev4') {
                    const refDate = (rev2.done && rev2.completedAt) ? new Date(rev2.completedAt) : new Date(baseDate.getTime() + (2 * 24 * 60 * 60 * 1000));
                    refDate.setHours(0, 0, 0, 0);
                    dueDate = new Date(refDate.getTime() + (4 * 24 * 60 * 60 * 1000));
                } else if (revType === 'rev7') {
                    let refDate;
                    if (rev4.done && rev4.completedAt) {
                        refDate = new Date(rev4.completedAt);
                        refDate.setHours(0, 0, 0, 0);
                        dueDate = new Date(refDate.getTime() + (7 * 24 * 60 * 60 * 1000));
                    } else if (rev2.done && rev2.completedAt) {
                        refDate = new Date(rev2.completedAt);
                        refDate.setHours(0, 0, 0, 0);
                        dueDate = new Date(refDate.getTime() + (11 * 24 * 60 * 60 * 1000)); // 4+7
                    } else {
                        refDate = new Date(baseDate.getTime() + (6 * 24 * 60 * 60 * 1000));
                        refDate.setHours(0, 0, 0, 0);
                        dueDate = new Date(refDate.getTime() + (7 * 24 * 60 * 60 * 1000));
                    }
                }

                const shortDate = dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

                // Add visual indicator if it is actively overdue 
                // (Only rev2 can be actively overdue if rev2 not done. If rev2 not done, rev4 is theoretically overdue but hidden by dependency in dashboard)
                const todayDate = new Date();
                todayDate.setHours(0, 0, 0, 0);

                // It is only "actively" overdue to display in red if its prerequisite is met. 
                // e.g. rev4 is ONLY overdue if rev2 IS done but rev4 timeline passed.
                let isActivelyOverdue = false;
                if (todayDate > dueDate) {
                    if (revType === 'rev2') isActivelyOverdue = true;
                    if (revType === 'rev4' && rev2.done) isActivelyOverdue = true;
                    if (revType === 'rev7' && rev4.done) isActivelyOverdue = true;
                }

                const dateHtml = `<div class="text-[0.65rem] font-medium mt-1 whitespace-nowrap" style="${isActivelyOverdue ? 'color: #ef4444;' : 'color: var(--text-secondary); opacity: 0.7;'}">Due: ${shortDate}</div>`;

                return `
                    <div class="flex flex-col items-center justify-center gap-1">
                        <div class="w-9 h-9 rounded-full flex flex-col items-center justify-center m-auto text-[1rem] transition-all bg-white/5 text-slate-400 border border-dashed border-white/20" ${isActivelyOverdue ? 'style="border-color: #ef4444; color: #ef4444;"' : ''}>
                            <i class="fa-solid ${isActivelyOverdue ? 'fa-circle-exclamation' : 'fa-hourglass-start'}" style="${isActivelyOverdue ? '' : 'opacity:0.3;'}"></i>
                        </div>
                        ${dateHtml}
                    </div>
                `;
            }
        };

        tr.innerHTML = `
            <td class="p-[1rem_1.5rem] border-b border-white/5 font-medium min-w-[150px]">${session.topic}</td>
            <td class="p-[1rem_1.5rem] border-b border-white/5 text-slate-400 min-w-[140px]"><i class="fa-regular fa-calendar" style="margin-right: 0.5rem; opacity: 0.7;"></i>${session.dateRead}</td>
            <td class="p-[1rem_1.5rem] border-b border-white/5 text-center">${getStatusCell(session, 'rev2')}</td>
            <td class="p-[1rem_1.5rem] border-b border-white/5 text-center">${getStatusCell(session, 'rev4')}</td>
            <td class="p-[1rem_1.5rem] border-b border-white/5 text-center">${getStatusCell(session, 'rev7')}</td>
        `;

        fragment.appendChild(tr);
    });
    revisionTableBody.appendChild(fragment);
}

// Export & Import Backup Logic
document.getElementById('btnExport').addEventListener('click', exportBackup);
document.getElementById('importFile').addEventListener('change', importBackup);
document.getElementById('btnDisconnectBackup').addEventListener('click', disconnectBackup);

function exportBackup() {
    // 1) Export Core Study Data (only active items)
    const activeStudySessions = studySessions.filter(s => !s.deleted);
    const activeTimeLogs = timeLogs.filter(l => !l.deleted);
    const studyDataStr = btoa(JSON.stringify({ studySessions: activeStudySessions, timeLogs: activeTimeLogs }));
    const studyBlob = new Blob([studyDataStr], { type: 'text/plain' });
    const studyUrl = URL.createObjectURL(studyBlob);

    const a1 = document.createElement('a');
    a1.href = studyUrl;
    a1.download = `HourForge_Backup_${getLocalDateStr()}.json`;
    document.body.appendChild(a1);
    a1.click();
    document.body.removeChild(a1);
    URL.revokeObjectURL(studyUrl);

    // 2) Export AI Ratings Separately 
    if (aiRatingsHistory && aiRatingsHistory.length > 0) {
        const aiDataStr = btoa(JSON.stringify({ aiRatingsHistory }));
        const aiBlob = new Blob([aiDataStr], { type: 'text/plain' });
        const aiUrl = URL.createObjectURL(aiBlob);

        const a2 = document.createElement('a');
        a2.href = aiUrl;
        a2.download = `HourForge_AIRatings_${getLocalDateStr()}.json`;

        // Slight delay to prevent some browsers from blocking the second download
        setTimeout(() => {
            document.body.appendChild(a2);
            a2.click();
            document.body.removeChild(a2);
            URL.revokeObjectURL(aiUrl);
        }, 300);
    }
}

function importBackup(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        try {
            let fileContent = event.target.result;
            let importedData;

            // Check if it looks like JSON structure vs Base64 payload
            if (fileContent.trim().startsWith('[') || fileContent.trim().startsWith('{')) {
                // Trying traditional plain text backup
                importedData = JSON.parse(fileContent);
            } else {
                // Attempt to decode the base64 string
                const decodedStr = atob(fileContent);
                importedData = JSON.parse(decodedStr);
            }
            if (Array.isArray(importedData)) {
                // Determine if it's the old study sessions array format
                if (importedData.length > 0 && importedData[0].subject) {
                    studySessions = importedData;
                    saveToLocalStorage();
                    renderDashboard();
                    renderTableView();
                    alert('Study Sessions Backup successfully restored!');
                } else if (importedData.length > 0 && importedData[0].score !== undefined) {
                    // Top-level array of history ratings
                    aiRatingsHistory = importedData;
                    localStorage.setItem('aiRatingsHistory', JSON.stringify(aiRatingsHistory));
                    alert('AI Ratings Backup successfully restored!');
                }
            } else if (importedData && typeof importedData === 'object') {
                let restoredSomething = false;

                if (importedData.studySessions || importedData.timeLogs) {
                    if (importedData.studySessions) studySessions = importedData.studySessions;
                    if (importedData.timeLogs) timeLogs = importedData.timeLogs;
                    saveToLocalStorage();
                    renderDashboard();
                    renderTableView();
                    renderTimeLogs();
                    restoredSomething = true;
                }

                if (importedData.aiRatingsHistory) {
                    aiRatingsHistory = importedData.aiRatingsHistory;
                    localStorage.setItem('aiRatingsHistory', JSON.stringify(aiRatingsHistory));
                    if (!restoredSomething) alert('AI Ratings Backup successfully restored!');
                    restoredSomething = true;
                }

                if (restoredSomething && (importedData.studySessions || importedData.timeLogs)) {
                    alert('Backup successfully restored!');
                } else if (!restoredSomething) {
                    alert('No valid data found in backup.');
                }
            } else {
                alert('Invalid backup format.');
            }
        } catch (error) {
            alert('Error parsing backup file. Make sure it is a valid JSON.');
        }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset file input
}

// Auto-Backup via File System Access API
document.getElementById('btnAutoBackup').addEventListener('click', setupAutoBackup);

function updateBackupUIVisually() {
    const btn = document.getElementById('btnAutoBackup');
    btn.innerHTML = '<i class="fa-solid fa-folder-check"></i> <span>Auto-Backup Active</span>';
    btn.style.background = 'rgba(16, 185, 129, 0.2)';
    btn.style.color = '#34d399';
    btn.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    document.getElementById('btnDisconnectBackup').style.display = 'flex';
}

async function restoreAutoBackupSettings() {
    try {
        const storedHandle = await idb.get('autoBackupFolderHandle');
        if (!storedHandle) return;

        // ALWAYS keep the handle reference even if permission isn't granted yet.
        backupDirHandle = storedHandle;

        // CRITICAL BUG FIX: We DO NOT verify readwrite permission on initialization.
        // Chrome's File System Access API `queryPermission` can hang the entire browser UI thread 
        // for 10-30 seconds if the folder is on a disconnected network drive or USB.
        // Instead, we immediately put it in "Reconnect" state, so it only queries when the user clicks.
        const btn = document.getElementById('btnAutoBackup');
        btn.innerHTML = '<i class="fa-solid fa-folder-open"></i> <span>Reconnect Folder</span>';
        btn.style.background = 'rgba(245, 158, 11, 0.2)';
        btn.style.color = '#fbbf24';
        btn.style.borderColor = 'rgba(245, 158, 11, 0.4)';
        document.getElementById('btnDisconnectBackup').style.display = 'flex';
    } catch (e) {
        console.warn("Could not restore backup handle from IDB", e);
    }
}

async function verifyPermission(fileHandle, readWrite, withRequest = false) {
    try {
        const options = {};
        if (readWrite) options.mode = 'readwrite';
        if ((await fileHandle.queryPermission(options)) === 'granted') return true;
        if (withRequest && (await fileHandle.requestPermission(options)) === 'granted') return true;
        return false;
    } catch (e) {
        console.warn('Permission check failed:', e);
        return false;
    }
}

async function setupAutoBackup() {
    try {
        if (!window.showDirectoryPicker) {
            alert("Your browser does not support the File System Access API. Please use Chrome.");
            return;
        }

        // If we already have a stored handle, try to re-grant permission
        // instead of picking a new folder (prevents accidental unlinking)
        if (backupDirHandle) {
            const hasPermission = await verifyPermission(backupDirHandle, true, true);
            if (hasPermission) {
                updateBackupUIVisually();
                await autoBackupSync();
                showToast('Backup folder reconnected successfully! ✅', 'success');
                return;
            }
        }

        // No existing handle or permission denied — pick a new folder
        backupDirHandle = await window.showDirectoryPicker({ mode: 'readwrite', id: 'hourforgeBackupDir' });
        await idb.set('autoBackupFolderHandle', backupDirHandle);
        updateBackupUIVisually();
        await autoBackupSync();
        showToast('Auto-Backup linked! Data will save to the selected folder automatically.', 'success');
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error(error);
            alert("Failed to setup Auto-Backup. Ensure you grant permission.");
        }
    }
}

async function autoBackupSync() {
    if (!backupDirHandle) return;
    try {
        const hasPermission = await verifyPermission(backupDirHandle, true, false);
        if (!hasPermission) {
            // Don't clear the handle! Just skip this sync silently.
            // The handle stays in IDB for next session's recovery.
            console.warn('Auto-backup skipped: permission not granted (will retry next interaction)');
            return;
        }
        // 1) Auto-backup Core Study Data
        const studyHandle = await backupDirHandle.getFileHandle('HourForge_AutoBackup.backup', { create: true });
        const studyWritable = await studyHandle.createWritable();
        await studyWritable.write(btoa(JSON.stringify({ studySessions, timeLogs })));
        await studyWritable.close();

        // 2) Auto-backup AI Ratings Separately
        if (aiRatingsHistory && aiRatingsHistory.length > 0) {
            const aiHandle = await backupDirHandle.getFileHandle('HourForge_AIRatings.backup', { create: true });
            const aiWritable = await aiHandle.createWritable();
            await aiWritable.write(btoa(JSON.stringify({ aiRatingsHistory })));
            await aiWritable.close();
        }
    } catch (error) {
        console.error("Auto-Backup save failed:", error);
        // NEVER clear backupDirHandle here — keep it for future recovery attempts
    }
}

// Make accessible to inline onclick handlers gracefully
window.completeRevision = completeRevision;
window.deleteSession = deleteSession;
window.deleteTimeLog = deleteTimeLog;
window.editTimeLog = editTimeLog;
