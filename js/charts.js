/**
 * HOURFORGE - CHARTS & AI ENGINE (js/charts.js)
 * =========================================================================
 * ⚠️ DEVELOPER & AI NOTICE ⚠️
 * This file relies on global variables declared in `script.js` (e.g. `studySessions`, `timeLogs`).
 * AI DIRECTIVE: If you add or remove charts, you MUST update this Table of Contents.
 * Do not wrap this file in an IIFE unless you pass in the globals.
 * 
 * Table of Contents:
 * [1] Chart Colors & Global defaults
 * [2] Study Hours Trend Chart (Bar/Line)
 * [3] Subject Distribution Chart (Doughnut)
 * [4] Peak Hours Chart (Bar)
 * [5] AI Growth Rating Chart (Line)
 * [6] Groq AI Integration (generateAIInsights, Prompt Construction, Error Handling)
 * =========================================================================
 */

// --- Chart Colors ---
const CHART_COLORS = {
    indigo: { bg: 'rgba(99, 102, 241, 0.2)', border: '#6366f1', fill: 'rgba(99, 102, 241, 0.1)' },
    pink: { bg: 'rgba(236, 72, 153, 0.2)', border: '#ec4899' },
    emerald: { bg: 'rgba(16, 185, 129, 0.2)', border: '#10b981' },
    amber: { bg: 'rgba(245, 158, 11, 0.2)', border: '#f59e0b' },
    sky: { bg: 'rgba(14, 165, 233, 0.2)', border: '#0ea5e9' },
    red: { bg: 'rgba(239, 68, 68, 0.2)', border: '#ef4444' },
};

// Ensure SUBJECT_CHART_COLORS is populated even if buildSubjectColors isn't globally available yet
// (This handles the race condition where charts.js loads before script.js defines the function)
if (typeof buildSubjectColors === 'function') {
    SUBJECT_CHART_COLORS = buildSubjectColors().chartColors;
} else if (typeof SUBJECT_CHART_COLORS === 'undefined') {
    // Fallback if script.js hasn't run yet - will be overwritten by script.js later
    SUBJECT_CHART_COLORS = {}; 
}

// Chart.js global defaults for dark theme
Chart.defaults.color = 'rgba(255,255,255,0.6)';
Chart.defaults.borderColor = 'rgba(255,255,255,0.07)';
Chart.defaults.font.family = 'Outfit, sans-serif';

// --- Chart 1: Study Hours Trend ---
function renderStudyHoursChart() {
    const { start } = getDateRange(currentPeriod);
    const logs = getFilteredLogs(currentPeriod).filter(log => !isNonStudyLog(log));

    // Build date labels and data
    const dateMap = {};
    const numDays = currentPeriod === 'today' ? 1 : currentPeriod === 'week' ? 7 : 30;

    for (let i = 0; i < numDays; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        dateMap[key] = 0;
    }

    logs.forEach(log => {
        if (dateMap[log.date] !== undefined) {
            dateMap[log.date] += log.duration;
        }
    });

    const formatLocalDate = (date) => {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const labels = Object.keys(dateMap).map(key => {
        const [y, m, d] = key.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        return formatDateLabel(date);
    });
    const data = Object.values(dateMap).map(v => parseFloat(v.toFixed(2)));

    const ctx = document.getElementById('chartStudyHours').getContext('2d');

    if (chartInstances.studyHours) chartInstances.studyHours.destroy();

    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

    chartInstances.studyHours = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Hours',
                data,
                borderColor: '#6366f1',
                backgroundColor: gradient,
                borderWidth: 2.5,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#6366f1',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: data.length <= 7 ? 5 : 3,
                pointHoverRadius: 7,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#a5b4fc',
                    borderColor: 'rgba(99,102,241,0.3)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 10,
                    callbacks: {
                        label: (ctx) => formatDurationReadable(ctx.parsed.y)
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { callback: v => formatDurationReadable(v) }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

// --- Chart 2: Subject Distribution ---
function renderSubjectDistChart() {
    const logs = getFilteredLogs(currentPeriod);
    const subjectHours = {};

    // Use explicit subject field if available, fall back to keyword matching for legacy logs
    const subjectKeywords = {
        'Physics': ['physics', 'phys', 'mechanics', 'thermodynamics', 'optics', 'waves', 'electro'],
        'Chemistry': ['chemistry', 'chem', 'organic', 'inorganic', 'reaction', 'chemical'],
        'Maths': ['math', 'maths', 'calculus', 'algebra', 'geometry', 'trigonometry', 'integration', 'differentiation'],
        'Computer': ['computer', 'coding', 'programming', 'code', 'software', 'algorithm', 'data structure', 'web', 'html', 'css', 'js', 'python'],
        'English': ['english', 'essay', 'grammar', 'literature', 'writing', 'reading', 'comprehension'],
        'Nepali': ['nepali', 'nepal']
    };

    logs.forEach(log => {
        // Prefer explicit subject tag
        if (log.subject) {
            subjectHours[log.subject] = (subjectHours[log.subject] || 0) + log.duration;
            return;
        }
        // Legacy fallback: keyword matching
        const taskLower = (log.task + ' ' + (log.notes || '')).toLowerCase();
        let matched = false;
        for (const [subject, keywords] of Object.entries(subjectKeywords)) {
            if (keywords.some(kw => taskLower.includes(kw))) {
                subjectHours[subject] = (subjectHours[subject] || 0) + log.duration;
                matched = true;
                break;
            }
        }
        if (!matched) {
            subjectHours['Other'] = (subjectHours['Other'] || 0) + log.duration;
        }
    });

    const labels = Object.keys(subjectHours);
    const data = Object.values(subjectHours).map(v => parseFloat(v.toFixed(2)));
    const colors = labels.map(l => SUBJECT_CHART_COLORS[l] || '#64748b');

    const ctx = document.getElementById('chartSubjectDist').getContext('2d');
    if (chartInstances.subjectDist) chartInstances.subjectDist.destroy();

    chartInstances.subjectDist = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderColor: 'rgba(15, 23, 42, 0.8)',
                borderWidth: 3,
                hoverBorderColor: '#fff',
                hoverBorderWidth: 2,
                hoverOffset: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        pointStyleWidth: 10,
                        font: { size: 12 },
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#a5b4fc',
                    borderColor: 'rgba(99,102,241,0.3)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 10,
                    callbacks: {
                        label: (ctx) => `${ctx.label}: ${formatDurationReadable(ctx.parsed)}`
                    }
                }
            }
        }
    });
}

// --- Chart 3: Peak Productivity Hours ---
function renderPeakHoursChart() {
    const logs = getFilteredLogs(currentPeriod).filter(log => !isNonStudyLog(log));
    // Count hours worked per hour-of-day slot
    const hourBuckets = new Array(24).fill(0);

    logs.forEach(log => {
        const startH = parseInt(log.startTime.split(':')[0]);
        const endH = parseInt(log.endTime.split(':')[0]);
        // Distribute duration across hours
        if (startH <= endH) {
            for (let h = startH; h <= endH && h < 24; h++) {
                hourBuckets[h] += log.duration / (endH - startH + 1);
            }
        } else { // overnight
            for (let h = startH; h < 24; h++) {
                hourBuckets[h] += log.duration / (24 - startH + endH + 1);
            }
            for (let h = 0; h <= endH; h++) {
                hourBuckets[h] += log.duration / (24 - startH + endH + 1);
            }
        }
    });

    // Show full 24 hours for complete daily pattern
    const slicedData = hourBuckets.map(v => parseFloat(v.toFixed(2)));
    const labels = [];
    for (let h = 0; h < 24; h++) {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        labels.push(`${hour12}${ampm}`);
    }

    // Color gradient: low hours get muted, high hours get vibrant
    const maxVal = Math.max(...slicedData, 0.1);
    const barColors = slicedData.map(v => {
        const intensity = v / maxVal;
        return `rgba(16, 185, 129, ${0.2 + intensity * 0.7})`;
    });

    const ctx = document.getElementById('chartPeakHours').getContext('2d');
    if (chartInstances.peakHours) chartInstances.peakHours.destroy();

    chartInstances.peakHours = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Hours',
                data: slicedData,
                backgroundColor: barColors,
                borderColor: 'rgba(16, 185, 129, 0.6)',
                borderWidth: 1,
                borderRadius: 6,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#34d399',
                    borderColor: 'rgba(16,185,129,0.3)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 10,
                    callbacks: {
                        label: (ctx) => `${formatDurationReadable(ctx.parsed.y)} active`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { callback: v => formatDurationReadable(v) }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 10 } }
                }
            }
        }
    });
}

// --- Chart 4: Revision Completion Rate ---
function renderRevisionChart() {
    let completed = 0;
    let pending = 0;
    let overdue = 0;

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    studySessions.filter(s => !s.deleted).forEach(session => {
        const baseDate = new Date(session.dateRead);
        baseDate.setHours(0, 0, 0, 0);

        ['rev2', 'rev4', 'rev7'].forEach(revType => {
            const rev = typeof session.revisions[revType] === 'boolean'
                ? { done: session.revisions[revType], completedAt: null }
                : session.revisions[revType];

            if (rev.done) {
                completed++;
            } else {
                // Check if overdue
                let dueDate = null;
                const rev2 = typeof session.revisions.rev2 === 'boolean' ? { done: session.revisions.rev2 } : session.revisions.rev2;
                const rev4 = typeof session.revisions.rev4 === 'boolean' ? { done: session.revisions.rev4 } : session.revisions.rev4;

                if (revType === 'rev2') dueDate = new Date(baseDate.getTime() + 2 * 86400000);
                else if (revType === 'rev4' && rev2.done) dueDate = new Date(baseDate.getTime() + 6 * 86400000);
                else if (revType === 'rev7' && rev4.done) dueDate = new Date(baseDate.getTime() + 13 * 86400000);

                if (dueDate && todayDate > dueDate) {
                    overdue++;
                } else {
                    pending++;
                }
            }
        });
    });

    const ctx = document.getElementById('chartRevisionRate').getContext('2d');
    if (chartInstances.revisionRate) chartInstances.revisionRate.destroy();

    chartInstances.revisionRate = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Pending', 'Overdue'],
            datasets: [{
                data: [completed, pending, overdue],
                backgroundColor: ['#10b981', '#6366f1', '#ef4444'],
                borderColor: 'rgba(15, 23, 42, 0.8)',
                borderWidth: 3,
                hoverBorderColor: '#fff',
                hoverBorderWidth: 2,
                hoverOffset: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        pointStyleWidth: 10,
                        font: { size: 12 },
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#a5b4fc',
                    borderColor: 'rgba(99,102,241,0.3)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 10,
                    callbacks: {
                        label: (ctx) => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(0) : 0;
                            return `${ctx.label}: ${ctx.parsed} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

// --- Chart 5: AI Rating Trend ---
function renderAIRatingChart() {
    const { start } = getDateRange(currentPeriod);
    const numDays = currentPeriod === 'today' ? 1 : currentPeriod === 'week' ? 7 : 30;

    // Build set of dates in the selected range
    const datesInRange = [];
    for (let i = 0; i < numDays; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        datesInRange.push(getLocalDateStr(d));
    }

    // Filter ratings: always show daily ratings within range (weekly/monthly don't generate ratings)
    const filteredHistory = [...aiRatingsHistory]
        .filter(r => r.period === 'today' && datesInRange.includes(r.dateLabel))
        .sort((a, b) => a.dateLabel.localeCompare(b.dateLabel));

    const labels = filteredHistory.length > 0
        ? filteredHistory.map(r => {
            const [y, m, d] = r.dateLabel.split('-').map(Number);
            return formatDateLabel(new Date(y, m - 1, d));
        })
        : ['No Data'];
    const data = filteredHistory.length > 0 ? filteredHistory.map(r => r.score) : [];

    const ctx = document.getElementById('chartAIRating').getContext('2d');
    if (chartInstances.aiRating) chartInstances.aiRating.destroy();

    chartInstances.aiRating = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'AI Rating',
                data,
                borderColor: '#fbbf24',
                backgroundColor: 'rgba(251, 191, 36, 0.1)',
                borderWidth: 3,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#fbbf24',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    ticks: { color: '#94a3b8', stepSize: 2 },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                x: {
                    ticks: { color: '#94a3b8', maxTicksLimit: 7 },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fbbf24',
                    borderColor: 'rgba(251,191,36,0.3)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 10,
                    callbacks: {
                        label: (ctx) => `Score: ${ctx.parsed.y}/10`
                    }
                }
            }
        }
    });
}
function renderAllCharts() {
    renderStudyHoursChart();
    renderSubjectDistChart();
    renderPeakHoursChart();
    renderRevisionChart();
    renderAIRatingChart();
    if (typeof calculateAndRenderStreak === 'function') calculateAndRenderStreak();

    // Update date range labels on charts
    const { start, end } = getDateRange(currentPeriod);
    const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const rangeText = currentPeriod === 'today'
        ? fmt(end)
        : `${fmt(start)} – ${fmt(end)}`;

    ['chartRangeStudy', 'chartRangeSubject', 'chartRangePeak', 'chartRangeRev', 'chartRangeRating'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = `📅 ${rangeText}`;
    });
}

// --- Gemini AI Integration ---
document.getElementById('btnGenerateInsights').addEventListener('click', generateAIInsights);

async function generateAIInsights() {
    const apiKey = GROQ_API_KEY;
    if (!apiKey) {
        alert('AI Insights are currently unavailable. Please contact the administrator.');
        return;
    }

    const btn = document.getElementById('btnGenerateInsights');
    const loadingEl = document.getElementById('aiLoadingIndicator');
    const contentEl = document.getElementById('aiFeedbackContent');

    btn.disabled = true;
    loadingEl.style.display = 'flex';
    contentEl.innerHTML = `
        <div class="skeleton-container">
            <div class="skeleton-block title"></div>
            <div class="skeleton-block p1"></div>
            <div class="skeleton-block p2"></div>
            <div class="skeleton-block p3"></div>
            <div class="skeleton-block title" style="margin-top: 1rem;"></div>
            <div class="skeleton-block p2"></div>
            <div class="skeleton-block p1"></div>
        </div>
    `;

    let aiChartData = null; // Track chart data for saving

    try {
        const targetDate = document.getElementById('insightsDatePicker').value || getLocalDateStr();
        const logs = getFilteredLogs(currentPeriod);
        const periodLabel = currentPeriod === 'today' ? "today" : currentPeriod === 'week' ? "the past 7 days" : "the past 30 days";

        // -- Build data summary -- pre-merge overnight pairs so AI sees correct totals --
        let totalHours = 0;
        const taskSummaries = [];
        const dailyBreakdown = {};
        const seenOvernightGroupsForMerge = new Set();

        logs.forEach(log => {
            // Overnight pair: merge both halves into ONE line so AI sees the real total
            if (log.overnightGroup) {
                if (seenOvernightGroupsForMerge.has(log.overnightGroup)) return;
                seenOvernightGroupsForMerge.add(log.overnightGroup);

                const paired = timeLogs.filter(l => l.overnightGroup === log.overnightGroup);
                const realTotal = parseFloat((log.overnightTotal || paired.reduce((s, l) => s + l.duration, 0)).toFixed(2));
                const origStart = log.overnightOriginalStart || log.startTime;
                const partnerLog = paired.find(l => l.id !== log.id) || log;
                const origEnd = log.overnightOriginalEnd || partnerLog.endTime;
                const subjectTag = (log.subject && log.subject !== 'General / Other') ? ` [Tagged: ${log.subject}]` : '';
                const cleanedNote = log.notes ? ' -- ' + log.notes.replace(' (continued from previous night)', '') : '';

                taskSummaries.push(`${log.date} | ${origStart}->${origEnd} (overnight, crosses midnight) | ${realTotal}h | "${log.task}"${subjectTag}${cleanedNote}`);
                totalHours += realTotal;
                dailyBreakdown[log.date] = (dailyBreakdown[log.date] || 0) + realTotal;
                return;
            }

            // Normal single-day entry
            totalHours += log.duration;
            const timeSlot = `${log.startTime}-${log.endTime}`;
            const subjectTag = (log.subject && log.subject !== 'General / Other') ? ` [Tagged: ${log.subject}]` : '';
            taskSummaries.push(`${log.date} | ${timeSlot} | ${log.duration}h | "${log.task}"${subjectTag}${log.notes ? ' -- ' + log.notes : ''}`);
            dailyBreakdown[log.date] = (dailyBreakdown[log.date] || 0) + log.duration;
        });

        const overnightContext = ''; // Overnight entries are pre-merged above

        const rawLogData = taskSummaries.length > 0 ? taskSummaries.join('\n') : 'No activities logged.';

        const _subjects = getSubjects();
        const chartPrompt = `You are a study activity categorizer. Read each activity's task name AND notes carefully to determine the real subject. Do NOT rely on tags — many are set to "General / Other" by default and are WRONG.

Activity Logs:
${rawLogData}

Subjects to categorize into: ${_subjects.join(', ')}, Sleep, Meditation, Other

Categorization rules:
- READ the task name and notes to understand what was actually studied
- Match activities to the closest subject from the list above
- "Meditation", "stretches", "morning ritual" = Meditation
- "Sleep", "nap" = Sleep
- "Wasted time", "not productive", "unproductive" = Other
- If a [Tagged: X] label exists AND is not "General / Other", use it
- IGNORE any "General / Other" tags completely

Return ONLY valid JSON:
{"subjectHours": {"Maths": 2.5, "Physics": 2.0, "Computer": 4.0}}

Only include subjects with hours > 0. Use exact decimal hours from the logs.`;

        console.debug('🤖 [AI Engine] Chart Prompt Context sent to Groq:', chartPrompt);
        const chartResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: chartPrompt }],
                temperature: 0.1,
                max_tokens: 300,
            })
        });

        if (chartResponse.ok) {
            const chartResult = await chartResponse.json();
            const chartText = chartResult.choices?.[0]?.message?.content || '';
            console.info('🤖 [AI Engine] Chart Subject JSON received from Groq:', chartText);
            try {
                // Extract JSON from response (handle markdown code blocks)
                const jsonMatch = chartText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const chartData = JSON.parse(jsonMatch[0]);
                    if (chartData.subjectHours) {
                        // Update Subject Distribution chart with AI data
                        renderSubjectDistChartWithData(chartData.subjectHours);
                        aiChartData = chartData;
                    }
                }
            } catch (parseErr) {
                console.warn('Could not parse AI chart data, using local calculation:', parseErr);
            }
        } else if (chartResponse.status === 401) {
            throw new Error('Invalid API Key. Please check your Groq API key and try again.');
        } else if (chartResponse.status === 429) {
            throw new Error('Rate limit reached. Groq\'s free tier allows limited requests per minute — please wait 60 seconds and try again.');
        }

        // Build chart-specific data for AI to reference
        // Peak hours data
        const hourBuckets = new Array(24).fill(0);
        logs.forEach(log => {
            const startH = parseInt(log.startTime.split(':')[0]);
            const endH = parseInt(log.endTime.split(':')[0]);
            if (startH <= endH) {
                for (let h = startH; h <= endH && h < 24; h++) {
                    hourBuckets[h] += log.duration / (endH - startH + 1);
                }
            }
        });
        const peakHoursSummary = hourBuckets
            .map((v, i) => ({ hour: i, value: parseFloat(v.toFixed(2)) }))
            .filter(h => h.value > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 5)
            .map(h => `${h.hour % 12 || 12}${h.hour >= 12 ? 'PM' : 'AM'}: ${h.value}h`)
            .join(', ');

        // Subject hours from logs
        const subjectBreakdown = {};
        logs.forEach(log => {
            const subj = log.subject || 'Uncategorized';
            subjectBreakdown[subj] = (subjectBreakdown[subj] || 0) + log.duration;
        });
        const subjectSummary = Object.entries(subjectBreakdown)
            .sort(([, a], [, b]) => b - a)
            .map(([s, h]) => `${s}: ${formatDurationReadable(h)}`)
            .join(', ');

        // --- Call 2: AI Feedback Text (Real Mentor) ---
        // Build lifetime context
        const allLogs = timeLogs || [];
        const lifetimeTotalHours = allLogs.reduce((sum, l) => sum + l.duration, 0);
        const allSubjects = {};
        allLogs.forEach(l => {
            const s = l.subject || 'Other';
            allSubjects[s] = (allSubjects[s] || 0) + l.duration;
        });
        const lifetimeSubjectSummary = Object.entries(allSubjects)
            .sort(([, a], [, b]) => b - a)
            .map(([s, h]) => `${s}: ${formatDurationReadable(h)}`)
            .join(', ');

        // Build study sessions context with due dates and overdue info
        const todayForRev = new Date();
        todayForRev.setHours(0, 0, 0, 0);
        const formatRevDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const revDaysDiff = (d1, d2) => Math.round((d2.getTime() - d1.getTime()) / 86400000);

        const overdueRevisions = [];
        const dueTodayRevisions = [];
        let revDone = 0;
        let revTotal = 0;

        const sessionsContext = studySessions.slice(0, 30).map(s => {
            const baseDate = new Date(s.dateRead); baseDate.setHours(0, 0, 0, 0);
            const rev2 = typeof s.revisions.rev2 === 'boolean' ? { done: s.revisions.rev2, completedAt: null } : s.revisions.rev2;
            const rev4 = typeof s.revisions.rev4 === 'boolean' ? { done: s.revisions.rev4, completedAt: null } : s.revisions.rev4;
            const rev7 = typeof s.revisions.rev7 === 'boolean' ? { done: s.revisions.rev7, completedAt: null } : s.revisions.rev7;

            // Track global revision completion stats for this coach prompt
            [rev2, rev4, rev7].forEach(rev => {
                if (!rev) return;
                revTotal += 1;
                if (rev.done) revDone += 1;
            });

            const revDetails = [];

            // Helper: build detail string for a revision step and track overdue/due-today
            const describeRev = (revObj, label, dueDate, isBlocked) => {
                if (revObj.done) {
                    const when = revObj.completedAt ? formatRevDate(new Date(revObj.completedAt)) : '?';
                    return `${label}: ✅ done (completed ${when})`;
                }
                if (isBlocked) return `${label}: ⏸️ blocked (finish previous step first)`;
                const dueDateStr = formatRevDate(dueDate);
                const diff = revDaysDiff(dueDate, todayForRev);
                if (diff > 0) {
                    overdueRevisions.push(`${s.subject}/${s.topic} — ${label} revision was due ${dueDateStr}, now ${diff} day(s) OVERDUE`);
                    return `${label}: ❌ OVERDUE by ${diff} day(s) (due: ${dueDateStr})`;
                } else if (diff === 0) {
                    dueTodayRevisions.push(`${s.subject}/${s.topic} — ${label} revision is DUE TODAY`);
                    return `${label}: 🔔 DUE TODAY (${dueDateStr})`;
                } else {
                    return `${label}: ⏳ upcoming (due: ${dueDateStr}, in ${Math.abs(diff)} day(s))`;
                }
            };

            // rev2: due 2 days after dateRead
            const rev2Due = new Date(baseDate.getTime() + 2 * 86400000);
            revDetails.push(describeRev(rev2, '2-day', rev2Due, false));

            // rev4: due 4 days after rev2 completion (or estimated baseDate+2 if no completedAt)
            const rev4Ref = rev2.done && rev2.completedAt ? new Date(new Date(rev2.completedAt).setHours(0, 0, 0, 0)) : new Date(baseDate.getTime() + 2 * 86400000);
            const rev4Due = new Date(rev4Ref.getTime() + 4 * 86400000);
            revDetails.push(describeRev(rev4, '4-day', rev4Due, !rev2.done));

            // rev7: due 7 days after rev4 completion
            const rev7Ref = rev4.done && rev4.completedAt ? new Date(new Date(rev4.completedAt).setHours(0, 0, 0, 0)) : new Date(rev4Ref.getTime() + 4 * 86400000);
            const rev7Due = new Date(rev7Ref.getTime() + 7 * 86400000);
            revDetails.push(describeRev(rev7, '7-day', rev7Due, !rev4.done));

            return `- ${s.subject}/${s.topic} (read: ${s.dateRead}) → ${revDetails.join(' | ')}`;
        }).join('\n');

        // Build a dedicated overdue/due-today summary for the AI
        let revisionAlertSection = '';
        if (dueTodayRevisions.length > 0 || overdueRevisions.length > 0) {
            revisionAlertSection = '\n## ⚠️ REVISION ALERTS (ACT ON THESE)\n';
            if (overdueRevisions.length > 0) {
                revisionAlertSection += 'OVERDUE (student MISSED these):\n' + overdueRevisions.map(r => `  🔴 ${r}`).join('\n') + '\n';
            }
            if (dueTodayRevisions.length > 0) {
                revisionAlertSection += 'DUE TODAY (must complete today):\n' + dueTodayRevisions.map(r => `  🟡 ${r}`).join('\n') + '\n';
            }
        }

        // Period-specific analysis focus
        const periodAnalysisFocus = currentPeriod === 'today' ? `
## DAILY MICRO-ANALYSIS (Today: ${targetDate})
This is a SINGLE DAY deep dive. Analyze at granular level:

1. **HOUR-BY-HOUR AUDIT**: Walk through the day chronologically. What did they do from waking to sleeping? Identify every gap, every wasted slot, every productive stretch. Be specific — "From 10:00-11:30 you did X, but then 11:30-13:00 was completely unaccounted for."

2. **ACADEMIC vs EVERYTHING ELSE**: Calculate exact hours for graded subjects (${getSubjects().join(', ')}) vs personal projects vs wellness (meditation, sleep, stretches) vs wasted time. Example: "Out of ${totalHours.toFixed(1)}h logged: Xh academic, Yh personal interest, Zh wellness, Wh unproductive."

3. **FOCUS QUALITY**: Did they do deep work (90+ min unbroken on one subject) or scattered short bursts? Short context-switching kills retention. Call out any session under 30 min as low-impact.

4. **ENERGY MISALLOCATION**: Were hard subjects done during peak cognitive hours (morning/early afternoon) or shoved into low-energy evening slots? This matters enormously.

5. **PROCRASTINATION DETECTION**: Look for patterns — did they start late? Take excessive breaks? Do easy/fun subjects first to avoid hard ones?

6. **REVISION COMPLIANCE**: Check today's 2-4-7 revision status. Did they complete what was due? Every missed revision compounds forgetting.

7. **SLEEP & RECOVERY**: If sleep data is present, evaluate: Did they get 7-8h? Late nights destroy next-day focus. A student sleeping at 1 AM and waking at 6 AM is running on fumes.

8. **BURNOUT CHECK**: Signs to flag — declining session lengths throughout the day, increasing "wasted time" entries, notes mentioning inability to focus, very long days (14h+) without proper breaks.`
            : currentPeriod === 'week' ? `
## WEEKLY PATTERN ANALYSIS (${periodLabel})
This is a 7-DAY pattern analysis. Look for TRENDS and CONSISTENCY:

1. **CONSISTENCY SCORE**: How many of the 7 days had meaningful study (4h+ academic)? A student studying 14h one day and 0h the next is worse than steady 6h/day. Calculate: days with 4h+ study / 7.

2. **ACADEMIC HOURS TREND**: Are daily academic hours increasing, decreasing, or flat across the week? Plot the direction. "Monday: 6h, Tuesday: 5h, ... Sunday: 2h" = alarming decline.

3. **SUBJECT COVERAGE MAP**: Which academic subjects got time THIS WEEK vs which got ZERO? ${(() => { const d = getProfile().exam1Date; if (!d) return 'Every subject needs regular contact.'; const ex = new Date(d); ex.setHours(0, 0, 0, 0); const n = new Date(); n.setHours(0, 0, 0, 0); return `With ${Math.round((ex - n) / 86400000)} days to ${getProfile().exam1Label || 'exams'}, every subject needs regular contact.`; })()} Flag any subject with 0h this week as CRITICAL NEGLECT.

4. **WEEKLY RHYTHM**: Which days were strongest/weakest? Is there a pattern (e.g., always low on weekends)? Identify the student's natural productive days vs slump days.

5. **REVISION DISCIPLINE (WEEK VIEW)**: How many revisions were due this week vs completed? Calculate completion rate. Below 70% = memory is actively decaying.

6. **PERSONAL INTEREST vs ACADEMIC RATIO (WEEKLY)**: If personal projects took >20% of total weekly hours, the balance is off with exams this close.

7. **CUMULATIVE FATIGUE**: Did performance degrade later in the week? If Thursday-Sunday shows declining hours and increasing "wasted time", burnout is building.

8. **PEAK PERFORMANCE WINDOWS**: Across the week, when (time of day) was the student most productive? Are they consistently leveraging this window for hard subjects?`
                : `
## MONTHLY STRATEGIC REVIEW (${periodLabel})
This is a 30-DAY macro analysis. Focus on BIG PICTURE and EXAM READINESS:

1. **EXAM COUNTDOWN REALITY CHECK**: ${(() => { const p = getProfile(); if (!p.exam1Date || !p.exam2Date) return 'Based on the exam timeline'; const e1 = new Date(p.exam1Date); e1.setHours(0, 0, 0, 0); const e2 = new Date(p.exam2Date); e2.setHours(0, 0, 0, 0); const n = new Date(); n.setHours(0, 0, 0, 0); return `With ${Math.round((e1 - n) / 86400000)} days to ${p.exam1Label || 'Exam 1'} and ${Math.round((e2 - n) / 86400000)} days to ${p.exam2Label || 'Exam 2'}`; })()} — is this student's monthly output sufficient? Calculate required daily academic hours to cover remaining syllabus.

2. **MONTHLY ACADEMIC HOURS TOTAL**: Sum all academic-only hours. Compare against what's needed. A ${getProfile().grade} ${getProfile().faculty} student should be doing 6-8h of pure academic study daily in the final stretch. Are they meeting this?

3. **SUBJECT DISTRIBUTION (MONTH)**: Pie chart analysis — which subjects consumed what percentage of the month? Identify the most neglected subjects. A subject with <5% of monthly hours needs emergency attention.

4. **TREND DIRECTION**: Compare Week 1 vs Week 2 vs Week 3 vs Week 4 of the month. Is the student improving, plateauing, or declining? This is the most important metric.

5. **CONSISTENCY OVER 30 DAYS**: How many days had 0h study? How many had 6h+? Calculate the "discipline ratio" = (days with 4h+ academic) / (total days in period). Below 0.7 is concerning.

6. **REVISION SYSTEM HEALTH**: Monthly completion rate for 2-4-7 revisions. Is the system being maintained or has it collapsed? Old unreviewed sessions = wasted initial study time.

7. **PERSONAL GROWTH vs EXAM PRIORITIES**: Monthly hours on personal interests vs academics. With exams this close, personal projects should be minimal (<10% of total time).

8. **BURNOUT TRAJECTORY**: Is there a pattern of high effort followed by crash days? Are crash periods getting longer? Sustainable pace > sporadic bursts.

9. **BIGGEST WINS & BIGGEST FAILURES**: Name the 3 best days and 3 worst days of the month by academic output. What was different about them? This reveals what conditions drive peak performance.`;

        const _p = getProfile();
        const _examTimeline = [];
        // Helper: timezone-safe days remaining (both dates normalized to local midnight)
        const _daysTo = (dateStr) => { const d = new Date(dateStr); d.setHours(0, 0, 0, 0); const n = new Date(); n.setHours(0, 0, 0, 0); return Math.round((d - n) / 86400000); };
        if (_p.exam1Date) _examTimeline.push(`- ${_p.exam1Label || 'Exam 1'}: ${_p.exam1Date} → ${_daysTo(_p.exam1Date)} days remaining`);
        if (_p.exam2Date) _examTimeline.push(`- ${_p.exam2Label || 'Exam 2'}: ${_p.exam2Date} → ${_daysTo(_p.exam2Date)} days remaining`);
        const _examSection = _examTimeline.length > 0
            ? `## EXAM TIMELINE (NON-NEGOTIABLE DEADLINES)\n${_examTimeline.join('\n')}\nEvery hour matters. Frame all analysis against these deadlines.`
            : '## EXAM TIMELINE\nNo exam dates configured. Analyze performance based on general study goals.';

        const feedbackPrompt = `You are an elite study coach and academic strategist for a ${_p.grade} ${_p.faculty} student${_p.name ? ` named ${_p.name}` : ''}. You have their COMPLETE activity data. Your job is to deliver a brutally honest, data-driven analysis that will materially improve their results.

DO NOT give generic advice. EVERY claim must reference specific data from the logs below.

## STUDENT PROFILE
- ${_p.grade} ${_p.faculty} student
- Academic subjects (GRADED, exam-critical): ${getSubjects().join(', ')}
- Personal interests (NOT graded): Other activities not in the subject list — valuable but NOT on the exam
- Wellness activities (NOT study): Meditation, sleep, stretches, exercise
- Unproductive time: Wasted time, couldn't concentrate, distracted

${_examSection}

## ALL-TIME STATS
- Lifetime hours logged: ${lifetimeTotalHours.toFixed(1)}h across ${allLogs.length} activities
- Active study sessions (spaced repetition): ${studySessions.length}

## CURRENT PERIOD: ${periodLabel}
- Hours this period: ${totalHours.toFixed(1)}h | Activities: ${logs.length} | Active days: ${Object.keys(dailyBreakdown).length}
- Revision stats: ${revDone}/${revTotal} completed
- Subject breakdown: ${subjectSummary || 'No subject data'}

## DETAILED ACTIVITY LOG (READ EVERY ENTRY — times, durations, subjects, notes):
${rawLogData}

## DAILY TOTALS:
${Object.entries(dailyBreakdown).map(([d, h]) => `${d}: ${h.toFixed(1)}h`).join(' | ') || 'No data'}

## PEAK STUDY HOURS:
${peakHoursSummary || 'No data'}

## SPACED REPETITION SESSIONS (2-4-7 method):
${sessionsContext || 'None yet'}
${revisionAlertSection}
${overnightContext}
${periodAnalysisFocus}

## RESPONSE STRUCTURE
Organize your response with these sections (use markdown headers):

### 📊 Performance Overview
Start with a quick summary — period type, total hours, academic vs non-academic split. Be concise.

### 🎯 Deep Analysis
Follow the numbered analysis points from the period-specific section above. Use data. Be specific. Reference exact activities, times, and subjects.

### ⚠️ Critical Warnings
Flag anything alarming: neglected subjects, broken revision chains, declining trends, sleep deprivation, burnout signs, exam readiness gaps. Only include if genuinely concerning — don't manufacture warnings.

### 📈 What's Working
Briefly acknowledge what the student is doing RIGHT. Specific examples only — no generic praise.

### 🗓️ Action Plan
${currentPeriod === 'today' ?
                'Provide a concrete TOMORROW SCHEDULE with time blocks (e.g., "06:00-08:00: Physics — Optics chapter problems"). Prioritize by exam proximity and subject neglect. Include breaks. Must be realistic but push the student.' :
                currentPeriod === 'week' ?
                    'Provide a NEXT WEEK STRATEGY: which subjects need emergency attention, suggested daily hour targets, specific topics to prioritize based on revision data and neglected areas.' :
                    'Provide a NEXT MONTH GAME PLAN: week-by-week focus areas leading to exams, subject priority order, minimum daily targets, revision system repairs if needed.'}

### 💬 Mentor\'s Note
One paragraph of direct, personal advice. Address the student\'s specific patterns — not generic motivation. If they\'re doing well, push them harder. If they\'re struggling, identify the ROOT CAUSE and give one concrete fix.

${currentPeriod === 'today' ? `
CRITICAL FINAL INSTRUCTION:
At the very end of your response, on its own line, you MUST rate this student's performance for ${targetDate} on a scale of 1 to 10.
Base the DAILY score on: hours of academic study (not personal projects), focus quality, revision compliance, schedule discipline, energy management. 1-3 = terrible day, 4-5 = below average, 6-7 = decent, 8-9 = strong day, 10 = exceptional.
Format it EXACTLY like this on a new line:
[[RATING: X/10]]
Where X is a number from 1 to 10. This is mandatory — never skip it.` : `
Do NOT include any [[RATING]] tag. This is a ${periodLabel} summary — ratings are only generated for individual days.`}`;


        console.debug('🤖 [AI Engine] Main Coach Prompt Context sent to Groq:', feedbackPrompt);
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: feedbackPrompt }],
                temperature: 0.7,
                max_tokens: 4096,
            })
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Invalid API Key — your Groq key was rejected. Please double-check it in the field above.');
            } else if (response.status === 429) {
                throw new Error('Rate limit hit! Groq\'s free tier limits requests per minute. Please wait about 60 seconds and try again.');
            }
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error?.message || `API request failed (${response.status})`);
        }

        const result = await response.json();
        let aiText = result.choices?.[0]?.message?.content;

        if (!aiText) throw new Error('No response from AI');

        // Extract Rating — only saved for daily ('today') period
        let ratingObj = null;
        const ratingMatch = aiText.match(/\[\[RATING:\s*(\d+)\/10\]\]/i);
        if (ratingMatch) {
            const score = parseInt(ratingMatch[1], 10);
            ratingObj = { score: score };

            // Remove the rating bracket from the visual text
            aiText = aiText.replace(/\[\[RATING:\s*\d+\/10\]\]/gi, '').trim();

            if (currentPeriod === 'today') {
                // Save to history — daily ratings only
                const existingIndex = aiRatingsHistory.findIndex(r => r.dateLabel === targetDate && r.period === 'today');

                if (existingIndex !== -1) {
                    aiRatingsHistory[existingIndex].score = score;
                    aiRatingsHistory[existingIndex].timestamp = Date.now();
                } else {
                    aiRatingsHistory.push({
                        timestamp: Date.now(),
                        dateLabel: targetDate,
                        period: 'today',
                        score: score
                    });
                }

                localStorage.setItem('aiRatingsHistory', JSON.stringify(aiRatingsHistory));
                autoBackupSync();
            }

            renderStarRating(score);
            renderAIRatingChart();
        } else {
            document.getElementById('aiRatingContainer').style.display = 'none';
        }

        const feedbackHtml = markdownToHtml(aiText);
        contentEl.innerHTML = feedbackHtml;

        // Save latest to localStorage (survives refresh)
        const periodNames = { today: 'Today', week: 'This Week', month: 'This Month' };
        lastInsightsPeriod = `${periodNames[currentPeriod]} (${new Date().toLocaleDateString()})`;
        saveLatestInsights(feedbackHtml, aiChartData, lastInsightsPeriod, ratingObj, targetDate);
        updateHistoryStatus();

    } catch (error) {
        console.error('AI Insights error:', error);
        // Show toast for user-friendly errors
        if (typeof showToast === 'function') {
            if (error.message.includes('Rate limit') || error.message.includes('429')) {
                showToast('⏳ Rate limit hit — wait 60s and retry', 'error');
            } else if (error.message.includes('Invalid API Key') || error.message.includes('401')) {
                showToast('🔑 Invalid API Key — check your key', 'error');
            }
        }
        contentEl.innerHTML = `
            <div class="ai-placeholder" style="color: #fca5a5;">
                <i class="fa-solid fa-triangle-exclamation" style="-webkit-text-fill-color: #fca5a5; background: none;"></i>
                <p><strong>Error:</strong> ${error.message}</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;">Check your API key or try again.</p>
            </div>`;
    } finally {
        btn.disabled = false;
        loadingEl.style.display = 'none';
    }
}

// Render Subject Distribution chart with AI-provided data
function renderSubjectDistChartWithData(subjectHoursData) {
    // Filter out zero-hour subjects
    const filtered = Object.entries(subjectHoursData).filter(([, h]) => h > 0);
    if (filtered.length === 0) return;

    const labels = filtered.map(([s]) => s);
    const data = filtered.map(([, h]) => parseFloat(h.toFixed(2)));
    const colors = labels.map(l => SUBJECT_CHART_COLORS[l] || '#64748b');

    const ctx = document.getElementById('chartSubjectDist').getContext('2d');
    if (chartInstances.subjectDist) chartInstances.subjectDist.destroy();

    chartInstances.subjectDist = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderColor: 'rgba(15, 23, 42, 0.8)',
                borderWidth: 3,
                hoverBorderColor: '#fff',
                hoverBorderWidth: 2,
                hoverOffset: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: { padding: 15, usePointStyle: true, pointStyleWidth: 10, font: { size: 12 } }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#a5b4fc',
                    borderColor: 'rgba(99,102,241,0.3)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 10,
                    callbacks: {
                        label: (ctx) => `${ctx.label}: ${ctx.parsed} hrs(AI analyzed)`
                    }
                }
            }
        }
    });
}

// Simple Markdown to HTML converter
function markdownToHtml(md) {
    let html = md
        // Headers
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        // Bold & Italic
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Inline code
        .replace(/`(.+?)`/g, '<code>$1</code>')
        // Unordered lists
        .replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
        // Ordered lists
        .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
        // Line breaks
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

    // Wrap consecutive <li> in <ul>
    html = html.replace(/(<li>.*?<\/li>)(?:<br>)*/gs, (match) => {
        return '<ul>' + match.replace(/<br>/g, '') + '</ul>';
    });

    return '<p>' + html + '</p>';
}

// --- Wire up Insights tab rendering ---
// When switching to insights view, render charts
if (typeof navBtns !== 'undefined') {
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.view === 'insightsView') {
                setTimeout(renderAllCharts, 100);
            }
        });
    });
} else {
    // Fallback: Use querySelectorAll directly if navBtns isn't global
    document.querySelectorAll('.nav-btn, .bottom-nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.view === 'insightsView') {
                setTimeout(renderAllCharts, 100);
            }
        });
    });
}

// Render Star Rating UI based on numeric score
function renderStarRating(score) {
    const container = document.getElementById('aiRatingContainer');
    const numberEl = document.getElementById('aiRatingNumber');
    const starsEl = document.getElementById('aiRatingStars');

    numberEl.textContent = score;
    let starsHtml = '';

    // We want exactly 10 stars total
    for (let i = 1; i <= 10; i++) {
        if (i <= score) {
            starsHtml += '<i class="fa-solid fa-star filled"></i>';
        } else {
            starsHtml += '<i class="fa-regular fa-star"></i>';
        }
    }

    starsEl.innerHTML = starsHtml;
    container.style.display = 'flex';
}

// Bootstrap Application is now handled inside syncDataWithCloud()

// ==========================================
// PSYCHOLOGY & MOTIVATION FEATURES
// ==========================================

const psychologyInsights = [
    "<strong>Active Recall:</strong> Re-reading is the least effective study method. Close the book and test yourself. The struggle to remember physically builds neural pathways.",
    "<strong>The Zeigarnik Effect:</strong> Your brain hates unfinished tasks. Just start for 5 minutes, and you'll likely feel compelled to finish.",
    "<strong>Spaced Repetition:</strong> Forgetting is a feature, not a bug. Reviewing material right before you forget it (2-4-7 method) cements it forever.",
    "<strong>Ultradian Rhythms:</strong> Multitasking is a myth. Work in 90-minute blocks of deep focus, then take a 20-minute break with no screens.",
    "<strong>Dopamine Prediction:</strong> Break your tasks into micro-goals. Checking off small boxes gives you the dopamine needed to keep studying.",
    "<strong>Sleep Consolidation:</strong> You gather info when studying, but you physically wire it into long-term memory while you sleep. Never cram at the expense of sleep."
];

async function renderDailyInsight() {
    const insightEl = document.getElementById('dailyInsightText');
    if (!insightEl) return;

    const todayStr = getLocalDateStr();
    const storedInsight = JSON.parse(localStorage.getItem('dailyAiInsight') || 'null');

    // Check if we hit the cache
    if (storedInsight && storedInsight.date === todayStr) {
        insightEl.innerHTML = storedInsight.text;
        return;
    }

    const apiKey = localStorage.getItem('groqApiKey');
    if (apiKey) {
        insightEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating personalized insight...';
        try {
            const prompt = "You are a neuroscience and behavioral psychology coach. Give the user a one-sentence, powerful psychological insight about studying, motivation, or learning. Emphasize concepts like active recall, spaced repetition, or dopamine. Don't respond with anything else (no greetings, no quotes marks if not needed). Use <strong> HTML tags to emphasize the core concept.";

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [{ role: 'system', content: prompt }],
                    temperature: 0.7, // Some variety but logically sound
                    max_tokens: 100
                })
            });

            if (response.ok) {
                const data = await response.json();
                let generatedText = data.choices[0].message.content.trim();
                // Strip leading/trailing quotes if the model adds them weirdly
                if (generatedText.startsWith('"') && generatedText.endsWith('"')) {
                    generatedText = generatedText.slice(1, -1);
                }

                if (generatedText) {
                    insightEl.innerHTML = generatedText;
                    localStorage.setItem('dailyAiInsight', JSON.stringify({ date: todayStr, text: generatedText }));
                    return;
                }
            } else {
                console.warn("API Error:", await response.text());
            }
        } catch (err) {
            console.error(err);
        }
    }

    // Fallback logic
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const insightIndex = dayOfYear % psychologyInsights.length;
    insightEl.innerHTML = psychologyInsights[insightIndex];
}

function calculateAndRenderStreak() {
    const uniqueDates = new Set();

    studySessions.filter(s => !s.deleted).forEach(s => {
        if (s.createdAt) uniqueDates.add(s.createdAt.split('T')[0]);
    });
    timeLogs.filter(t => !t.deleted).forEach(t => {
        if (t.date) uniqueDates.add(t.date);
        if (t.createdAt) uniqueDates.add(t.createdAt.split('T')[0]);
    });

    const sortedDates = Array.from(uniqueDates).sort((a, b) => new Date(b) - new Date(a));

    let currentStreak = 0;

    // Use strictly formatted strings for consistent local timezone comparison
    const formatDate = (dateObj) => {
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    };

    let checkDate = new Date();
    const todayStr = formatDate(checkDate);
    checkDate.setDate(checkDate.getDate() - 1);
    const yesterdayStr = formatDate(checkDate);

    // If streak active today or yesterday
    if (!sortedDates.includes(todayStr) && !sortedDates.includes(yesterdayStr)) {
        currentStreak = 0;
    } else {
        // Count backwards
        let checkingDate = new Date();
        if (!sortedDates.includes(todayStr)) {
            checkingDate.setDate(checkingDate.getDate() - 1);
        }

        while (true) {
            const dateStr = formatDate(checkingDate);
            if (sortedDates.includes(dateStr)) {
                currentStreak++;
                checkingDate.setDate(checkingDate.getDate() - 1);
            } else {
                break;
            }
        }
    }

    const badge = document.getElementById('streakBadge');
    if (badge) {
        if (currentStreak > 0) {
            document.getElementById('streakCount').textContent = currentStreak;
            badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

// 5-Minute Start Timer Logic
let timerInterval;
let timerSeconds = 300; // 5 mins

const countdownDisplay = document.getElementById('countdownDisplay');
const btnStartTimer = document.getElementById('btnStartTimer');
const btnResetTimer = document.getElementById('btnResetTimer');

function updateTimerDisplay() {
    if (!countdownDisplay) return;
    const m = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
    const s = (timerSeconds % 60).toString().padStart(2, '0');
    countdownDisplay.textContent = `${m}:${s}`;
}

if (btnStartTimer && btnResetTimer) {
    btnStartTimer.addEventListener('click', () => {
        if (btnStartTimer.textContent.includes('Start') || btnStartTimer.textContent.includes('Resume')) {
            // Start/Resume
            btnStartTimer.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
            btnStartTimer.style.background = '#f59e0b'; // Amber

            timerInterval = setInterval(() => {
                timerSeconds--;
                if (timerSeconds <= 0) {
                    clearInterval(timerInterval);
                    timerSeconds = 0;
                    updateTimerDisplay();
                    btnStartTimer.innerHTML = '<i class="fa-solid fa-check"></i> Done!';
                    btnStartTimer.style.background = '#10b981'; // Emerald
                    btnStartTimer.disabled = true;
                    showToast("5 minutes complete! You've broken the friction. Keep going!", "success");
                } else {
                    updateTimerDisplay();
                }
            }, 1000);
        } else if (btnStartTimer.textContent.includes('Pause')) {
            // Pause
            clearInterval(timerInterval);
            btnStartTimer.innerHTML = '<i class="fa-solid fa-play"></i> Resume';
            btnStartTimer.style.background = 'var(--color-computer)';
        }
    });

    btnResetTimer.addEventListener('click', () => {
        clearInterval(timerInterval);
        timerSeconds = 300;
        updateTimerDisplay();
        btnStartTimer.innerHTML = '<i class="fa-solid fa-play"></i> Start';
        btnStartTimer.style.background = 'var(--color-computer)';
        btnStartTimer.disabled = false;
    });
}
