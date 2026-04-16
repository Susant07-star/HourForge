
// ==========================================
// TIME TRACKER LOGIC
// ==========================================

const addTimeLogForm = document.getElementById('addTimeLogForm');
const timeLogFeed = document.getElementById('timeLogFeed');
const totalHoursTodayEl = document.getElementById('totalHoursToday');
const historyDateFilter = document.getElementById('historyDateFilter');

// --- FRICTIONLESS DATA ENTRY LOGIC ---

// 1. Global Smart Categorization Dictionary (Privacy-Safe)
const AUTO_SUBJECT_DICTIONARY = {
    'math': 'Math', 'calculus': 'Math', 'algebra': 'Math', 'geometry': 'Math',
    'physics': 'Physics', 'mechanics': 'Physics', 'thermodynamics': 'Physics',
    'chemistry': 'Chemistry', 'organic': 'Chemistry',
    'biology': 'Biology', 'anatomy': 'Biology',
    'code': 'Computer', 'coding': 'Computer', 'programming': 'Computer', 'react': 'Computer', 'python': 'Computer', 'leetcode': 'Computer', 'js': 'Computer',
    'read': 'Reading', 'book': 'Reading', 'novel': 'Reading',
    'gym': 'Exercise', 'workout': 'Exercise', 'run': 'Exercise', 'walk': 'Exercise',
    'sleep': 'Sleep', 'nap': 'Sleep', 'rest': 'Sleep'
};

// Auto-select subject and intelligent durations when typing task
document.getElementById('timeTaskInput').addEventListener('input', (e) => {
    const taskName = e.target.value.trim().toLowerCase();
    const subjectSelect = document.getElementById('timeSubjectInput');
    
    // Dynamically update generic durations based on typing
    if (typeof renderIntelligentDurations === 'function') {
        renderIntelligentDurations(taskName);
    }
    
    // Reset to generic if they cleared the input
    if (!taskName) {
        subjectSelect.value = '';
        return;
    }

    // Check personal history first
    const historicalMatch = timeLogs.find(log => !log.deleted && log.task.toLowerCase() === taskName && log.subject);
    if (historicalMatch) {
        subjectSelect.value = historicalMatch.subject;
        return;
    }
    
    // Check if we can infer subject from task name prefixes (e.g., "Math: Homework")
    const colonSplit = taskName.split(':');
    if (colonSplit.length > 1) {
        const potentialSubject = colonSplit[0].trim();
        // Capitalize first letter
        const formattedSubject = potentialSubject.charAt(0).toUpperCase() + potentialSubject.slice(1);
        
        // Check if this matches a known subject
        const hasOption = Array.from(subjectSelect.options).some(opt => opt.value.toLowerCase() === formattedSubject.toLowerCase());
        if (hasOption) {
            subjectSelect.value = Array.from(subjectSelect.options).find(opt => opt.value.toLowerCase() === formattedSubject.toLowerCase()).value;
            return;
        }
    }

    // Fall back to Global Dictionary
    for (const [key, category] of Object.entries(AUTO_SUBJECT_DICTIONARY)) {
        if (taskName.includes(key)) {
            // Check if this category exists in the user's profile subjects
            const hasOption = Array.from(subjectSelect.options).some(opt => opt.value === category);
            if (hasOption) subjectSelect.value = category;
            break;
        }
    }
});

// 2. Smart Time Autofill
function autoFillSmartTimes() {
    const startInput = document.getElementById('timeStartInput');
    const endInput = document.getElementById('timeEndInput');
    const dateInput = document.getElementById('timeDateInput');
    if (!startInput || !endInput) return;

    const now = new Date();

    // Default End Time is ALWAYS exactly Right Now
    endInput.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Also update Flatpickr if it exists for end time
    if (endInput._flatpickr) {
        endInput._flatpickr.setDate(now, true);
    }

    // Use the currently selected log date (backfill-friendly), falling back to today
    const targetDateStr = (dateInput && dateInput.value) ? dateInput.value : getLocalDateStr();
    
    // Logic to handle Overnight transitions:
    // If the user selects "Today", check if there was an activity "Yesterday" that went past midnight (00:00+).
    // Or if there is a log on "Today" that started at 00:00 (which would be the second half of a split).
    
    const targetLogs = timeLogs
        .filter(log => !log.deleted && log.date === targetDateStr)
        .sort((a, b) => b.endTime.localeCompare(a.endTime));

    if (targetLogs.length > 0) {
        // Snap exactly to end of last session for that date
        const lastLog = targetLogs[0];
        if (startInput._flatpickr) {
            startInput._flatpickr.setDate(lastLog.endTime, true);
        } else {
            startInput.value = lastLog.endTime;
        }
    } else {
        // No logs for this specific date yet.
        // CHECK OVERNIGHT CASE: Did the *previous day* have a log that ended after midnight (technically on this day)?
        // OR did the previous day have a log that ended at 23:59 and we should resume at 00:00?
        
        // Actually, if an overnight split happened, there WOULD be a log on `targetDateStr` starting at 00:00.
        // So `targetLogs` would NOT be empty. 
        // Example: 9 PM - 12:08 AM split -> Log A (9pm-23:59, Day 1) & Log B (00:00-00:08, Day 2).
        // If user is now logging for Day 2, `targetLogs` finds Log B. `lastLog` is Log B. End time is 00:08.
        // So the start time for the NEW log becomes 00:08. This is correct behavior.
        
        // BUT if the user manually entered a log on Day 1 that went to 12:08 AM *without* splitting (if logic failed?),
        // or if they just want to resume from yesterday's last log?
        
        // Let's check the previous calendar day's last log just in case.
        const d = new Date(targetDateStr);
        d.setDate(d.getDate() - 1);
        const prevDateStr = getLocalDateStr(d);
        
        const prevLogs = timeLogs
            .filter(log => !log.deleted && log.date === prevDateStr)
            .sort((a, b) => b.endTime.localeCompare(a.endTime));
            
        if (prevLogs.length > 0) {
            // Found a log from yesterday. 
            // Use its end time as the start time for today (Continuity)
            const lastPrevLog = prevLogs[0];
            const newStart = lastPrevLog.endTime;
            
            if (startInput._flatpickr) {
                startInput._flatpickr.setDate(newStart, true);
            } else {
                startInput.value = newStart;
            }
        } else {
             // No logs yesterday either. Default.
            const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));
            const defaultStart = `${String(oneHourAgo.getHours()).padStart(2, '0')}:${String(oneHourAgo.getMinutes()).padStart(2, '0')}`;
            if (startInput._flatpickr) {
                startInput._flatpickr.setDate(defaultStart, true);
            } else {
                startInput.value = defaultStart;
            }
        }
    }
}

// Event listener for date change to trigger smart autofill and update suggestions
document.getElementById('timeDateInput')?.addEventListener('change', (e) => {
    autoFillSmartTimes();
    renderQuickActivityChips();
    
    // Also sync the history view to this date
    const historyFilter = document.getElementById('historyDateFilter');
    if (historyFilter) {
        if (historyFilter._flatpickr) {
            historyFilter._flatpickr.setDate(e.target.value, true);
        } else {
            historyFilter.value = e.target.value;
            // manually trigger change event if needed, but flatpickr usually handles it
            historyFilter.dispatchEvent(new Event('change')); 
        }
    }
});

// 2.5 Smart Note Suggestions
function renderNoteSuggestions(currentTask = '') {
    const container = document.getElementById('smartNoteSuggestions');
    if (!container) return;
    
    // Clear if no task
    if (!currentTask) {
        container.style.display = 'none';
        return;
    }

    const suggestions = new Set();
    
    // 1. Generic Templates
    suggestions.add("Continued from previous session");
    suggestions.add("Completed chapter/section");
    suggestions.add("Review and practice problems");
    
    // 2. Context-Aware History
    if (timeLogs && timeLogs.length > 0) {
        // Find previous logs for this exact task
        const relevantLogs = timeLogs
            .filter(log => log.task && log.task.toLowerCase() === currentTask.toLowerCase() && log.notes)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 3); // Look at last 3 entries
            
        relevantLogs.forEach(log => {
            // If the note contains "Chapter X" or numbers, try to increment
            const numberMatch = log.notes.match(/(\d+)/);
            if (numberMatch) {
                const nextNum = parseInt(numberMatch[0]) + 1;
                const nextNote = log.notes.replace(numberMatch[0], nextNum);
                suggestions.add(nextNote);
            }
            
            // "Continued from [Date]"
            if (log.date) {
                suggestions.add(`Continued from ${log.date}`);
            }
        });
    }

    // Render Chips
    container.innerHTML = '';
    if (suggestions.size === 0) {
        container.style.display = 'none';
        return;
    }

    const label = document.createElement('span');
    label.style.fontSize = '0.7rem';
    label.style.color = 'var(--text-secondary)';
    label.style.width = '100%';
    label.textContent = 'Quick Notes:';
    container.appendChild(label);

    suggestions.forEach(text => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'bg-white/5 border border-white/10 text-slate-400 px-3 py-1 rounded-full text-[0.75rem] cursor-pointer transition-all hover:bg-emerald-500/15 hover:border-emerald-500/30 hover:text-emerald-300';
        chip.textContent = text;
        
        chip.addEventListener('click', () => {
            const noteInput = document.getElementById('timeNotesInput');
            // Append or replace? Let's replace if empty, append if not
            if (noteInput.value.trim()) {
                noteInput.value += ` | ${text}`;
            } else {
                noteInput.value = text;
            }
            noteInput.focus();
            updateClearBtnVisibility(); // Ensure button appears when chip adds text
        });
        
        container.appendChild(chip);
    });
    container.style.display = 'flex';
}

// Clear Note Button Logic
const clearNotesBtn = document.getElementById('btnClearNotes');
const noteInput = document.getElementById('timeNotesInput');

function updateClearBtnVisibility() {
    if (clearNotesBtn && noteInput) {
        clearNotesBtn.style.display = noteInput.value.trim().length > 0 ? 'inline-block' : 'none';
    }
}

if (clearNotesBtn) {
    clearNotesBtn.addEventListener('click', () => {
        if (noteInput) {
            noteInput.value = '';
            noteInput.style.height = 'auto'; // Reset height
            noteInput.focus();
            updateClearBtnVisibility();
        }
    });
}

if (noteInput) {
    noteInput.addEventListener('input', updateClearBtnVisibility);
}

// Trigger note suggestions when task changes
document.getElementById('timeTaskInput')?.addEventListener('input', (e) => {
    renderNoteSuggestions(e.target.value.trim());
});

// 3. Quick-Duration Buttons (Ultra-Intelligent Auto-Scaling)
function renderIntelligentDurations(currentTask = '') {
    const container = document.getElementById('quickDurationContainer');
    if (!container) return;
    
    // Default standard blocks if history is missing/empty
    let targetDurationsMins = [15, 30, 45, 60, 90, 120];
    
    // If we have history, try to find patterns for THIS specific task
    if (timeLogs && timeLogs.length > 0) {
        // Filter history by current task (case-insensitive)
        const relevantLogs = currentTask 
            ? timeLogs.filter(log => log.task && log.task.toLowerCase() === currentTask.toLowerCase()) 
            : [];
        
        if (relevantLogs.length >= 3) {
            // We have enough data for this specific task!
            const durationCounts = {};
            relevantLogs.forEach(log => {
                if (!log.duration) return;
                // Round to nearest 5 mins to group similar durations (e.g., 43m -> 45m)
                let mins = Math.round(log.duration * 60);
                mins = Math.round(mins / 5) * 5; 
                if (mins > 0 && mins <= 480) { 
                    durationCounts[mins] = (durationCounts[mins] || 0) + 1;
                }
            });
            
            // Sort by frequency
            const popularMins = Object.entries(durationCounts)
                .sort((a,b) => b[1] - a[1]) // Sort by count descending
                .map(entry => parseInt(entry[0]))
                .slice(0, 4); // Take top 4 most common durations
            
            if (popularMins.length > 0) {
                targetDurationsMins = popularMins.sort((a,b) => a - b);
            }
        }
    }
    
    // Generate Button HTML
    container.innerHTML = '';
    
    targetDurationsMins.forEach(mins => {
        // Format beautifully
        let label = `+${mins}m`;
        if (mins >= 60) {
            if (mins % 60 === 0) label = `+${mins / 60}h`;
            else label = `+${parseFloat((mins / 60).toFixed(1))}h`;
        }
        
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-duration'; // Ensure CSS styles this class
        btn.style.cssText = `
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: var(--text-secondary);
            padding: 0.4rem 0.8rem;
            border-radius: 0.5rem;
            font-size: 0.85rem;
            cursor: pointer;
            transition: all 0.2s;
        `;
        btn.dataset.mins = mins;
        btn.textContent = label;
        
        // Hover effect
        btn.onmouseover = () => { btn.style.background = 'rgba(255, 255, 255, 0.1)'; btn.style.color = 'var(--text-primary)'; };
        btn.onmouseout = () => { btn.style.background = 'rgba(255, 255, 255, 0.05)'; btn.style.color = 'var(--text-secondary)'; };
        
        // Attach logic
        btn.addEventListener('click', (e) => {
            const minsToAdd = parseInt(e.target.dataset.mins);
            const startInput = document.getElementById('timeStartInput');
            const endInput = document.getElementById('timeEndInput');
            
            // Get start time
            let startVal = startInput.value;
            if (startInput._flatpickr) startVal = startInput.value;
            if (!startVal) return;

            // Calculate new end time relative to the START time box
            const startParts = startVal.split(':');
            const startDate = new Date();
            startDate.setHours(parseInt(startParts[0]), parseInt(startParts[1]), 0, 0);
            
            const newEndDate = new Date(startDate.getTime() + (minsToAdd * 60000));
            const newEndStr = `${String(newEndDate.getHours()).padStart(2, '0')}:${String(newEndDate.getMinutes()).padStart(2, '0')}`;
            
            // Update input (handling Flatpickr if present)
            if (endInput._flatpickr) {
                endInput._flatpickr.setDate(newEndStr, true);
            } else {
                endInput.value = newEndStr;
            }
            
            // Brief haptic/visual feedback
            if (navigator.vibrate) navigator.vibrate(30);
            e.target.style.transform = 'scale(1.1)';
            e.target.style.background = 'var(--accent-primary)';
            e.target.style.color = '#fff';
            e.target.style.borderColor = 'var(--accent-primary)';
            
            setTimeout(() => {
                e.target.style.transform = 'scale(1)';
                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                e.target.style.color = 'var(--text-secondary)';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }, 200);
        });
        
        container.appendChild(btn);
    });
}

// 4. Quick Activity Chips (Intelligent Suggestions)
function renderQuickActivityChips() {
    const container = document.getElementById('quickActivityChips');
    
    // Determine context based on SELECTED date in form
    const dateInput = document.getElementById('timeDateInput');
    const selectedDateStr = (dateInput && dateInput.value) ? dateInput.value : getLocalDateStr();
    const selectedDate = new Date(selectedDateStr);
    
    // If selected date is "today", we prioritize time-of-day.
    // If "yesterday", we prioritize what usually happens on that day-of-week.
    const isToday = selectedDateStr === getLocalDateStr();
    
    const now = new Date();
    const currentHour = now.getHours(); 
    const currentDay = selectedDate.getDay(); 
    
    let topTasks = [];

    // NEW USER EXPERIENCE: If no logs exist, show generic starter suggestions
    if (!timeLogs || timeLogs.length === 0) {
        // Get user's subjects (if any) or default ones
        const subjects = getSubjects() || [];
        const starterTasks = [
            { task: "Reading Textbook", subject: subjects[0] || "General" },
            { task: "Solving Problems", subject: subjects[1] || "Maths" },
            { task: "Watching Lectures", subject: subjects[0] || "Physics" },
            { task: "Revision", subject: "General" },
            { task: "Sleep", subject: "Sleep" }
        ];

        topTasks = starterTasks.map(t => ({
            task: t.task,
            subject: t.subject,
            note: "",
            isContinue: false
        }));
    } else {
        // EXISTING LOGIC for returning users...
        const taskScores = {};
        const latestNotes = {};
        
        // Sort logs by date descending to find the very last activity for "Continue" feature
        const sortedLogs = timeLogs.filter(l => !l.deleted).sort((a, b) => {
            const dateA = new Date(a.date + (a.startTime ? 'T' + a.startTime : ''));
            const dateB = new Date(b.date + (b.startTime ? 'T' + b.startTime : ''));
            return dateB - dateA;
        });
        const lastLog = sortedLogs[0];

        timeLogs.filter(l => !l.deleted).forEach(log => {
            if (!log.task) return;
            const key = `${log.task}|${log.subject}`;
            
            // Filter out blacklisted suggestions
            if (window.suggestionBlacklist && window.suggestionBlacklist.includes(key)) return;
            
            let score = 1; // Base score per occurrence
            
            // 1. Time Context (Same time of day +/- 2 hours)
            // Only apply strong time context if we are logging for TODAY. 
            if (isToday && log.startTime) {
                const logHour = parseInt(log.startTime.split(':')[0]);
                const hourDiff = Math.min(Math.abs(currentHour - logHour), Math.abs(currentHour + 24 - logHour), Math.abs(currentHour - 24 - logHour));
                if (hourDiff <= 2) score += 4; // High weight for time relevance
            }

            // 2. Day Context (Same day of the week)
            if (log.date) {
                const logDate = new Date(log.date);
                if (!isNaN(logDate.getTime())) {
                    if (logDate.getDay() === currentDay) score += 3; // High weight for weekly routine (e.g. Physics on Mondays)

                    // 3. Recency (Boost tasks done recently relative to the selected date)
                    // Calculate diff between log date and selected date
                    const diffTime = Math.abs(selectedDate - logDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                    
                    if (diffDays <= 7) score += 2; // Last week
                    if (diffDays <= 1) score += 5; // Yesterday/Today (Very strong signal)
                }
            }
            
            taskScores[key] = (taskScores[key] || 0) + score;
            
            // Store the most recent authentic note used for this task combination
            if (!latestNotes[key] && log.notes && !log.notes.startsWith('General ')) {
                latestNotes[key] = log.notes;
            }
        });

        topTasks = Object.entries(taskScores)
            .sort((a, b) => b[1] - a[1]) // Sort by total weighted score
            .slice(0, 6)
            .map(entry => {
                const [task, subject] = entry[0].split('|');
                return { 
                    task, 
                    subject, 
                    note: latestNotes[entry[0]] || `General ${task}`,
                    isContinue: false
                };
            });

        // "Continue" Feature: Always ensure the very last task is option #1
        if (lastLog && lastLog.task) {
            const existingIdx = topTasks.findIndex(t => t.task === lastLog.task && t.subject === lastLog.subject);
            
            const continueItem = {
                task: lastLog.task,
                subject: lastLog.subject,
                note: lastLog.notes || `General ${lastLog.task}`,
                isContinue: true
            };

            if (existingIdx !== -1) {
                // Remove it from its current position so we can prepend it
                topTasks.splice(existingIdx, 1);
            }
            // Add to front
            topTasks.unshift(continueItem);
        }

        // Limit to 6 items total
        topTasks = topTasks.slice(0, 6);
    }

    if (topTasks.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.innerHTML = '';
    
    // Add "Suggestions" label
    const label = document.createElement('div');
    label.style.width = '100%';
    label.style.display = 'flex';
    label.style.justifyContent = 'space-between';
    label.style.alignItems = 'center';
    label.style.fontSize = '0.75rem';
    label.style.color = 'var(--text-secondary)';
    label.style.marginBottom = '0.5rem';
    label.innerHTML = `
        <span>SUGGESTED FOR YOU</span>
        <span style="font-size: 0.7em; opacity: 0.7;">(Tap to select)</span>
    `;
    container.appendChild(label);

    topTasks.forEach(({task, subject, note, isContinue}) => {
        const chip = document.createElement('div');
        chip.className = 'inline-flex items-center gap-1 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[0.75rem] text-slate-400 cursor-pointer transition-all duration-200 select-none hover:bg-emerald-500/15 hover:border-emerald-500/30 hover:text-emerald-300 active:scale-95 [&.chip-selected]:bg-red-400/15 [&.chip-selected]:border-red-400/40 [&.chip-selected]:text-red-300';
        
        if (isContinue) {
            chip.classList.add('border-amber-400/40', 'bg-amber-400/10');
        }
        
        chip.dataset.task = task;
        chip.dataset.subject = subject;
        chip.dataset.note = note;
        
        const icon = isContinue ? '<i class="fa-solid fa-forward" style="color: #fbbf24; font-size: 0.8em;"></i>' : '<i class="fa-solid fa-bolt" style="color: var(--text-secondary); font-size: 0.8em;"></i>';
        const prefix = isContinue ? 'Continue: ' : '';
        
        // Main content
        const contentSpan = document.createElement('span');
        contentSpan.innerHTML = `${icon} ${prefix}${task}`;
        chip.appendChild(contentSpan);
        
        chip.addEventListener('click', () => {
            if (navigator.vibrate) navigator.vibrate(15);
            const taskInput = document.getElementById('timeTaskInput');
            const subjectSelect = document.getElementById('timeSubjectInput');
            const notesInput = document.getElementById('timeNotesInput');
            const endInput = document.getElementById('timeEndInput');
            
            const isSelected = chip.classList.contains('chip-selected');
            
            if (isSelected) {
                // DESELECT: clear the fields this chip filled
                taskInput.value = '';
                subjectSelect.value = '';
                notesInput.value = '';
                // Trigger visibility check for clear button immediately
                if (typeof updateClearBtnVisibility === 'function') updateClearBtnVisibility();
                
                chip.classList.remove('chip-selected');
                chip.querySelector('.chip-content').innerHTML = `${icon} ${prefix}${task}`;
                // Recalculate intelligent durations (cleared)
                if (typeof renderIntelligentDurations === 'function') renderIntelligentDurations();
            } else {
                // DESELECT any other chip first
                container.querySelectorAll('.chip-selected').forEach(c => {
                    c.classList.remove('chip-selected');
                    // Reset text
                    const isCont = c.style.border.includes('solid'); // crude check for continue chip
                    const ic = isCont ? '<i class="fa-solid fa-forward" style="color: #fbbf24; font-size: 0.8em;"></i>' : '<i class="fa-solid fa-bolt" style="color: var(--text-secondary); font-size: 0.8em;"></i>';
                    const pre = isCont ? 'Continue: ' : '';
                    const cc = c.querySelector('.chip-content');
                    if (cc) cc.innerHTML = `${ic} ${pre}${c.dataset.task}`;
                });
                
                // SELECT this one
                chip.classList.add('chip-selected');
                chip.querySelector('.chip-content').innerHTML = `<i class="fa-solid fa-check" style="color: #4ade80; font-size: 0.8em;"></i> ${task}`;
                
                // Fill form
                taskInput.value = task;
                subjectSelect.value = subject;
                if (note && note !== 'undefined') {
                    notesInput.value = note;
                    // Trigger visibility check for clear button immediately
                    if (typeof updateClearBtnVisibility === 'function') updateClearBtnVisibility();
                }

                // Update End Time to NOW
                if (endInput) {
                    const now = new Date();
                    // Force seconds to 00
                    now.setSeconds(0, 0);
                    const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    if (endInput._flatpickr) {
                        endInput._flatpickr.setDate(now, true);
                    } else {
                        endInput.value = nowStr;
                    }
                }
                
                // Trigger smart durations for THIS task
                if (typeof renderIntelligentDurations === 'function') renderIntelligentDurations(task);
            }
        });
        
        container.appendChild(chip);
    });
    
    container.style.display = 'flex';
}

// ------------------------------------------

historyDateFilter.addEventListener('change', renderTimeLogs);

addTimeLogForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const taskName = document.getElementById('timeTaskInput').value.trim();
    const subject = document.getElementById('timeSubjectInput').value;
    const startTimeStr = document.getElementById('timeStartInput').value;
    const endTimeStr = document.getElementById('timeEndInput').value;
    const dateStr = document.getElementById('timeDateInput').value;
    const notes = document.getElementById('timeNotesInput').value.trim();

    if (!taskName || !startTimeStr || !endTimeStr || !dateStr) return;

    // Parse start/end times
    const start = new Date(`2000-01-01T${startTimeStr}`);
    let end = new Date(`2000-01-01T${endTimeStr}`);

    // Detect overnight shift (end time is earlier than start time)
    const isOvernight = end <= start;

    if (isOvernight) {
        // SPLIT at midnight into two separate log entries
        // Part 1: original date, startTime → 23:59 (before midnight)
        // FIX: Use the next day for end time to get correct duration calculation
        const endOfDay = new Date(`2000-01-01T23:59:59`);
        const midnightMs = endOfDay.getTime() - start.getTime() + 1000; // +1 second to include the full minute
        const beforeMidnightHours = parseFloat((midnightMs / (1000 * 60 * 60)).toFixed(2));

        // Part 2: next date, 00:00 → endTime (after midnight)
        // FIX: Calculate from midnight on the NEXT day to the end time
        const startOfNextDay = new Date(`2000-01-02T00:00:00`);
        const endNextDay = new Date(`2000-01-02T${endTimeStr}`);
        const afterMidnightMs = endNextDay.getTime() - startOfNextDay.getTime();
        const afterMidnightHours = parseFloat((afterMidnightMs / (1000 * 60 * 60)).toFixed(2));

        // Calculate next day's date string (avoid toISOString timezone trap)
        const nextDay = new Date(dateStr + 'T12:00:00'); // noon avoids DST edge cases
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`;

        const now = new Date().toISOString();
        const overnightGroupId = `overnight_${Date.now()}`;
        const totalOvernightHours = parseFloat((beforeMidnightHours + afterMidnightHours).toFixed(2));

        // Log 1: Before midnight (original date)
        if (beforeMidnightHours > 0) {
            timeLogs.unshift({
                id: Date.now().toString(),
                task: taskName,
                subject: subject || '',
                startTime: startTimeStr,
                endTime: '23:59',
                date: dateStr,
                duration: beforeMidnightHours,
                notes: notes,
                createdAt: now,
                updatedAt: now,
                overnightGroup: overnightGroupId,
                overnightTotal: totalOvernightHours,
                overnightOriginalStart: startTimeStr,
                overnightOriginalEnd: endTimeStr
            });
        }

        // Log 2: After midnight (next date)
        if (afterMidnightHours > 0) {
            timeLogs.unshift({
                id: (Date.now() + 1).toString(),
                task: taskName,
                subject: subject || '',
                startTime: '00:00',
                endTime: endTimeStr,
                date: nextDayStr,
                duration: afterMidnightHours,
                notes: notes + ' (continued from previous night)',
                createdAt: now,
                updatedAt: now,
                overnightGroup: overnightGroupId,
                overnightTotal: totalOvernightHours,
                overnightOriginalStart: startTimeStr,
                overnightOriginalEnd: endTimeStr
            });
        }
    } else {
        // Normal same-day entry
        const durationMs = end - start;
        const durationHours = (durationMs / (1000 * 60 * 60)).toFixed(2);

        timeLogs.unshift({
            id: Date.now().toString(),
            task: taskName,
            subject: subject || '',
            startTime: startTimeStr,
            endTime: endTimeStr,
            date: dateStr,
            duration: parseFloat(durationHours),
            notes: notes,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }

    saveToLocalStorage();
    renderTimeLogs();

    // Auto-backup trigger
    autoBackupSync();

    // Preserve the date the user was logging for (important for backfilling)
    const lastDateStr = dateStr;
    const lastEndTimeStr = endTimeStr;
    addTimeLogForm.reset();
    const dateEl = document.getElementById('timeDateInput');
    if (dateEl) {
        dateEl.value = lastDateStr || getLocalDateStr();
    }

    // Hard-set times immediately so the form never appears blank after reset.
    // Start time should continue from the last end time; end time should refresh to "now".
    const startEl = document.getElementById('timeStartInput');
    const endEl = document.getElementById('timeEndInput');
    
    // Restore Date Input (handle Flatpickr if present)
    if (dateEl) {
        if (dateEl._flatpickr) {
            dateEl._flatpickr.setDate(lastDateStr || getLocalDateStr(), true);
        } else {
            dateEl.value = lastDateStr || getLocalDateStr();
        }
    }

    if (startEl && lastEndTimeStr) {
        if (startEl._flatpickr) {
            startEl._flatpickr.setDate(lastEndTimeStr, true);
        } else {
            startEl.value = lastEndTimeStr;
        }
    }
    
    if (endEl) {
        const now = new Date();
        const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        if (endEl._flatpickr) {
            endEl._flatpickr.setDate(nowStr, true);
        } else {
            endEl.value = nowStr;
        }
    }

    // Then run the smart autofill to normalize based on the selected date/history.
    autoFillSmartTimes(); // Reset to smart times instead of blank
    renderQuickActivityChips(); // Refresh chips in case a new pattern emerged
    if (typeof renderIntelligentDurations === 'function') renderIntelligentDurations(); // Reset to generalized popular durations

    // Reset textarea height after clearing
    const notesEl = document.getElementById('timeNotesInput');
    notesEl.style.height = 'auto';
});

// Enter to submit log, Shift+Enter for new line
document.getElementById('timeNotesInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('addTimeLogForm').requestSubmit();
    }
});

// Auto-resize textarea for short notes
document.getElementById('timeNotesInput').addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
});

function renderTimeLogs() {
    timeLogFeed.innerHTML = '';
    const filterDate = historyDateFilter.value;

    let dailyTotal = 0;

    const filteredLogs = timeLogs.filter(log => !log.deleted && log.date === filterDate);

    if (filteredLogs.length === 0) {
        timeLogFeed.innerHTML = `
            <div class="text-center text-slate-500 p-8">
                <i class="fa-solid fa-mug-hot text-[2rem] mb-4 opacity-50 block"></i>
                No activities logged for this date.
            </div>
        `;
    }

    const fragment = document.createDocumentFragment();
    filteredLogs.forEach(log => {
        dailyTotal += log.duration;

        // format to 12-hour AM/PM purely for display
        const formatTime = (timeStr) => {
            const [h, m] = timeStr.split(':');
            let hour = parseInt(h);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            hour = hour % 12 || 12;
            return `${hour}:${m} ${ampm}`;
        };

        const item = document.createElement('div');
        item.className = 'grid grid-cols-[1fr_auto] items-center gap-4 bg-black/20 border border-white/5 border-l-4 rounded-2xl p-5 transition-all duration-300 hover:bg-white/5 hover:translate-x-1 hover:shadow-lg animated-entry';
        
        if (log.subject) {
            item.style.borderLeftColor = `var(--color-${log.subject.toLowerCase()})`;
        } else {
            item.style.borderLeftColor = '#10b981';
        }

        let notesHtml = '';
        if (log.notes) {
            notesHtml = `<div class="text-[0.9rem] text-slate-400 mt-2 font-serif italic col-span-full"><i class="fa-solid fa-quote-left opacity-50 mr-1.5"></i> ${log.notes}</div>`;
        }
        let actionBtnsHtml = `
            <div class="flex gap-2 mt-2">
                <button class="bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 rounded-lg px-2.5 py-1 text-[0.8rem] font-medium transition-colors hover:bg-indigo-500/20 hover:text-indigo-200" title="Edit this log" onclick="editTimeLog('${log.id}')"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
                <button class="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-2.5 py-1 text-[0.8rem] font-medium transition-colors hover:bg-red-500/20 hover:text-red-300" title="Delete this log" onclick="deleteTimeLog('${log.id}')"><i class="fa-solid fa-trash-can"></i> Delete</button>
            </div>`;

        const subjectBadge = log.subject ? `<span class="inline-block bg-indigo-500/15 text-indigo-300 px-2.5 py-0.5 rounded-full text-[0.7rem] font-semibold ml-2 align-middle tracking-wide uppercase">${log.subject}</span>` : '';

        item.innerHTML = `
            <div class="flex flex-col">
                <div class="text-[1.15rem] font-medium mb-1 text-slate-200">${log.task}${subjectBadge}</div>
                <div class="text-[0.9rem] text-slate-400 flex items-center gap-1.5"><i class="fa-regular fa-clock"></i> ${formatTime(log.startTime)} - ${formatTime(log.endTime)}</div>
                ${notesHtml}
                ${actionBtnsHtml}
            </div>
            <div class="text-[1.25rem] font-bold text-emerald-400 text-right">
                ${log.duration} <span class="text-[0.8rem] text-slate-400 font-medium">hrs</span>
            </div>
        `;
        fragment.appendChild(item);
    });
    timeLogFeed.appendChild(fragment);

    totalHoursTodayEl.textContent = dailyTotal.toFixed(1);

    if (typeof calculateAndRenderStreak === 'function') calculateAndRenderStreak();
}

// View & Table DOM
// const navBtns = document.querySelectorAll('.nav-btn'); // Moved above
// const viewSections = document.querySelectorAll('.view-section'); // Moved above
const subTabs = document.querySelectorAll('.sub-tab');
// const revisionTableBody = document.getElementById('revisionTableBody'); // Moved above
