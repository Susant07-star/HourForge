
// ==========================================
// AI INSIGHTS TAB
// ==========================================

let currentPeriod = 'today';
let chartInstances = {}

async function disconnectBackup() {
    if (!confirm("Disconnect Auto-Backup folder? Your data will stop syncing automatically to the folder.\n\nUse this before letting Agent bots test the app so they don't overwrite your real backups.")) return;

    backupDirHandle = null;
    await idb.delete('autoBackupFolderHandle');

    const btn = document.getElementById('btnAutoBackup');
    btn.innerHTML = '<i class="fa-solid fa-folder-tree"></i> <span>Auto-Backup</span>';
    btn.style.background = 'transparent';
    btn.style.color = 'inherit';
    btn.style.borderColor = 'transparent';

    document.getElementById('btnDisconnectBackup').style.display = 'none';
    showToast('Auto-backup folder disconnected', 'info');
};


// --- AI Insights (per-date storage, capped at 30 days) ---

let lastInsightsPeriod = null;

function saveLatestInsights(feedbackHtml, chartData, periodLabel, ratingObj, targetDate) {
    const insightData = {
        feedback: feedbackHtml,
        chartData: chartData || null,
        period: periodLabel,
        rating: ratingObj || null,
        timestamp: Date.now()
    };

    // Save per-date insights map
    let insightsMap = {};
    try { insightsMap = JSON.parse(localStorage.getItem('aiInsightsMap') || '{}'); } catch (e) { }
    insightsMap[targetDate] = insightData;

    // Cap at 30 entries (remove oldest)
    const entries = Object.entries(insightsMap);
    if (entries.length > 30) {
        entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
        entries.slice(0, entries.length - 30).forEach(([key]) => delete insightsMap[key]);
    }
    localStorage.setItem('aiInsightsMap', JSON.stringify(insightsMap));
}

function loadInsightsForDate(dateStr) {
    try {
        const insightsMap = JSON.parse(localStorage.getItem('aiInsightsMap') || '{}');
        const data = insightsMap[dateStr];
        if (data && data.feedback) {
            document.getElementById('aiFeedbackContent').innerHTML = data.feedback;
            if (data.chartData && data.chartData.subjectHours) renderSubjectDistChartWithData(data.chartData.subjectHours);
            if (data.rating) renderStarRating(data.rating.score);
            else document.getElementById('aiRatingContainer').style.display = 'none';
            lastInsightsPeriod = data.period;
            updateHistoryStatus();
            return true;
        }
    } catch (e) { }
    return false;
}

function showInsightsPlaceholder() {
    document.getElementById('aiFeedbackContent').innerHTML = `
        <div class="ai-placeholder">
            <i class="fa-solid fa-wand-magic-sparkles"></i>
            <p>AI Analysis and study feedback will be provided soon by the developer or administrator.</p>
        </div>`;
    document.getElementById('aiRatingContainer').style.display = 'none';
    lastInsightsPeriod = null;
    updateHistoryStatus();
}

function loadLatestInsights() {
    // Try today's date first
    const today = getLocalDateStr();
    if (loadInsightsForDate(today)) return;

    // Fall back to most recent available insight
    try {
        const insightsMap = JSON.parse(localStorage.getItem('aiInsightsMap') || '{}');
        const sorted = Object.entries(insightsMap).sort(([, a], [, b]) => b.timestamp - a.timestamp);
        if (sorted.length > 0) {
            const [, data] = sorted[0];
            document.getElementById('aiFeedbackContent').innerHTML = data.feedback;
            if (data.chartData && data.chartData.subjectHours) renderSubjectDistChartWithData(data.chartData.subjectHours);
            if (data.rating) renderStarRating(data.rating.score);
            else document.getElementById('aiRatingContainer').style.display = 'none';
            lastInsightsPeriod = data.period;
            updateHistoryStatus();
        }
    } catch (e) { }
}

function updateHistoryStatus() {
    const statusEl = document.getElementById('insightsHistoryStatus');
    if (!statusEl) return;
    if (lastInsightsPeriod) {
        statusEl.textContent = `Last: ${lastInsightsPeriod}`;
    } else {
        statusEl.textContent = 'Waiting for analysis...';
    }
}

// Date picker initialization
const insightsDatePicker = document.getElementById('insightsDatePicker');
insightsDatePicker.value = getLocalDateStr();

insightsDatePicker.addEventListener('change', () => {
    renderAllCharts();
    if (!loadInsightsForDate(insightsDatePicker.value)) showInsightsPlaceholder();
});

document.getElementById('btnPrevDay').addEventListener('click', () => {
    const [y, m, d] = insightsDatePicker.value.split('-').map(Number);
    const date = new Date(y, m - 1, d - 1);
    insightsDatePicker.value = getLocalDateStr(date);
    renderAllCharts();
    if (!loadInsightsForDate(insightsDatePicker.value)) showInsightsPlaceholder();
});

document.getElementById('btnNextDay').addEventListener('click', () => {
    const [y, m, d] = insightsDatePicker.value.split('-').map(Number);
    const date = new Date(y, m - 1, d + 1);
    const today = getLocalDateStr();
    const nextStr = getLocalDateStr(date);
    if (nextStr <= today) {
        insightsDatePicker.value = nextStr;
        renderAllCharts();
        if (!loadInsightsForDate(insightsDatePicker.value)) showInsightsPlaceholder();
    }
});

// Load latest insights on init
setTimeout(() => {
    loadLatestInsights();
}, 500);

// --- Period Selector ---
document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentPeriod = btn.dataset.period;
        renderAllCharts();
    });
});

// --- Data Helpers ---
function getDateRange(period) {
    // Use date picker value as reference date (defaults to today)
    const picker = document.getElementById('insightsDatePicker');
    const refDate = picker && picker.value ? new Date(picker.value + 'T00:00:00') : new Date();
    refDate.setHours(0, 0, 0, 0);
    const end = new Date(refDate);
    end.setHours(23, 59, 59, 999);

    let start = new Date(refDate);
    if (period === 'week') {
        start.setDate(start.getDate() - 6); // 7 days ending on selected date
    } else if (period === 'month') {
        start.setDate(start.getDate() - 29); // 30 days ending on selected date
    }
    return { start, end };
}

function getFilteredLogs(period) {
    const { start, end } = getDateRange(period);
    return timeLogs.filter(log => {
        if (log.deleted) return false;
        const d = new Date(log.date);
        d.setHours(12, 0, 0, 0); // Normalize
        return d >= start && d <= end;
    });
}

function formatDateLabel(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

