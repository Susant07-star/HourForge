// ==========================================
// MOBILE NAVIGATION — Bottom Tab Bar + Swipe
// ==========================================

// Ordered list of swipeable tab IDs (matches bottom nav order, excluding pomodoro)
const SWIPE_TABS = ['dashboardView', 'tableView', 'hourLogView', 'insightsView', 'pomodoroView'];

// Keep old selectors alive for any existing code that references them
const navBtns = document.querySelectorAll('.nav-btn');
const viewSections = document.querySelectorAll('.view-section');

// Track current tab index
let currentTabIndex = 0;

// --- Tab switching (used by bottom nav, sidebar, AND swipe) ---
function switchTab(viewId, animate = true) {
    const idx = SWIPE_TABS.indexOf(viewId);
    if (idx !== -1) currentTabIndex = idx;

    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');

    document.querySelectorAll('.bottom-nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === viewId);
    });

    document.querySelectorAll('.sidebar-nav-item').forEach(btn => {
        btn.classList.remove('active-sidebar-item');
    });

    // When user navigates to the Time Tracker tab, pre-fill smart times and helpers
    if (viewId === 'hourLogView') {
        const dateEl = document.getElementById('timeDateInput');
        if (dateEl && !dateEl.value) {
            dateEl.value = getLocalDateStr();
        }
        autoFillSmartTimes();
        if (typeof renderQuickActivityChips === 'function') renderQuickActivityChips();
        if (typeof renderIntelligentDurations === 'function') renderIntelligentDurations();
    }
    
    // Auto-load charts if navigating to Insights tab
    if (viewId === 'insightsView' && typeof renderAllCharts === 'function') {
        // slight delay to let the slide animation run smooth before heavy chart painting
        setTimeout(renderAllCharts, 100); 
    }

    if (animate) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        window.scrollTo(0, 0);
    }
    
    // Save current tab to localStorage
    localStorage.setItem('activeTab', viewId);
}

// --- Bottom nav click handler ---
document.querySelectorAll('.bottom-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        // Pomo is now a normal tab
        switchTab(view);
    });
});

// Also wire up old nav-btn clicks (compat)
navBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.view));
});

// ==========================================
// INSTAGRAM-STYLE HORIZONTAL SWIPE
// ==========================================
(function initSwipe() {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchCurrentX = 0;
    let intentDetected = false;   // 'horizontal' | 'vertical' | false
    let isSwiping = false;
    const SWIPE_THRESHOLD = 50;   // px to commit a tab change
    const INTENT_THRESHOLD = 8;   // px movement before we decide H vs V

    function getViewEls() {
        return SWIPE_TABS.map(id => document.getElementById(id)).filter(Boolean);
    }

    function positionSibling(el, offsetX, baseTop) {
        if (!el) return;
        el.style.transition = 'none';
        el.style.display = 'block';
        el.style.position = 'absolute';
        el.style.top = baseTop + 'px';
        el.style.left = '0';
        el.style.width = '100%';
        el.style.minHeight = '100vh'; // Prevent seeing body background if scrolled
        el.style.transform = `translateX(${offsetX}px)`;
        el.style.zIndex = '10';       // Ensure siblings sit above random static content
        el.style.animation = 'none';  // Disable the default fadeIn CSS animation during swipe
        el.style.opacity = '1';       // Ensure full visibility while dragging
    }

    function applyDrag(deltaX) {
        const views = getViewEls();
        const currentEl = views[currentTabIndex];
        const w = currentEl.offsetWidth; // Must use element width so siblings abut perfectly regardless of padding

        // Ensure current element keeps its layout but translates
        currentEl.style.transition = 'none';
        currentEl.style.transform = `translateX(${deltaX}px)`;

        // We use currentEl.offsetTop so incoming tabs align perfectly under the header
        const baseTop = currentEl.offsetTop;

        const nextEl = views[currentTabIndex + 1];
        if (nextEl) positionSibling(nextEl, w + deltaX, baseTop);

        const prevEl = views[currentTabIndex - 1];
        if (prevEl) positionSibling(prevEl, -w + deltaX, baseTop);
    }

    function snapTo(targetIndex) {
        const views = getViewEls();
        const currentEl = views[currentTabIndex];
        const w = currentEl.offsetWidth;
        const nextEl = views[currentTabIndex + 1];
        const prevEl = views[currentTabIndex - 1];

        const isNext = targetIndex > currentTabIndex;
        const isPrev = targetIndex < currentTabIndex;
        const isSame = targetIndex === currentTabIndex;

        const duration = '0.35s';
        const ease = 'cubic-bezier(0.25, 1, 0.5, 1)';

        // Animate current sliding out (or snapping back)
        if (currentEl) {
            currentEl.style.transition = `transform ${duration} ${ease}`;
            if (isNext) currentEl.style.transform = `translateX(${-w}px)`;
            else if (isPrev) currentEl.style.transform = `translateX(${w}px)`;
            else currentEl.style.transform = `translateX(0px)`;
        }

        // Animate next sliding in (or out)
        if (nextEl) {
            nextEl.style.transition = `transform ${duration} ${ease}`;
            if (isNext) nextEl.style.transform = `translateX(0px)`;
            else if (isPrev) nextEl.style.transform = `translateX(${2 * w}px)`;
            else nextEl.style.transform = `translateX(${w}px)`;
        }

        // Animate prev sliding in (or out)
        if (prevEl) {
            prevEl.style.transition = `transform ${duration} ${ease}`;
            if (isPrev) prevEl.style.transform = `translateX(0px)`;
            else if (isNext) prevEl.style.transform = `translateX(${-2 * w}px)`;
            else prevEl.style.transform = `translateX(${-w}px)`;
        }

        // Wait for animation, then cleanup and commit tab switch
        setTimeout(() => {
            if (!isSame) {
                // Pre-emptively set the DOM state so there is NO FLASH when we strip the absolute positioning
                const targetViewId = SWIPE_TABS[targetIndex];
                document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
                const targetEl = document.getElementById(targetViewId);
                if (targetEl) targetEl.classList.add('active');

                // Now execute the logical switch (which will update the bottom nav UI and trigger charts)
                // Pass false for 'animate' so switchTab doesn't override our smooth scroll position
                switchTab(targetViewId, false);
            }

            // Clean up the inline styles we used for dragging
            [currentEl, nextEl, prevEl].filter(Boolean).forEach(el => {
                el.style.transition = '';
                el.style.transform = '';
                el.style.display = '';
                el.style.position = '';
                el.style.top = '';
                el.style.left = '';
                el.style.width = '';
                el.style.minHeight = '';
                el.style.zIndex = '';
                el.style.animation = ''; // restore normal CSS animation rules
                el.style.opacity = '';
            });

        }, 360);
    }

    document.addEventListener('touchstart', e => {
        if (document.fullscreenElement) return;
        const modals = document.querySelectorAll('.modal-overlay[style*="flex"], .sidebar-drawer.open, .profile-drawer.open');
        if (modals.length > 0) return;

        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchCurrentX = touchStartX;
        intentDetected = false;
        isSwiping = false;
    }, { passive: true });

    document.addEventListener('touchmove', e => {
        if (!touchStartX) return;

        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        touchCurrentX = e.touches[0].clientX;

        if (!intentDetected && (Math.abs(dx) > INTENT_THRESHOLD || Math.abs(dy) > INTENT_THRESHOLD)) {
            intentDetected = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
        }

        if (intentDetected !== 'horizontal') return;

        if (dx > 0 && currentTabIndex === 0) return;
        if (dx < 0 && currentTabIndex === SWIPE_TABS.length - 1) return;

        // Only lock scrolling vertically once horizontal intent is confirmed. 
        // We can't actually preventDefault() here since listener is passive. 
        // But applying the CSS transform gives immediate feedback.
        isSwiping = true;

        const resistance = 0.3;
        const atEdge = (dx > 0 && currentTabIndex === 0) || (dx < 0 && currentTabIndex === SWIPE_TABS.length - 1);
        const effectiveDx = atEdge ? dx * resistance : dx;

        applyDrag(effectiveDx);
    }, { passive: true });

    document.addEventListener('touchend', e => {
        if (!isSwiping) {
            touchStartX = 0;
            return;
        }

        const dx = touchCurrentX - touchStartX;
        isSwiping = false;
        touchStartX = 0;

        if (Math.abs(dx) >= SWIPE_THRESHOLD) {
            // Trigger haptic feedback for a successful swipe
            if (navigator.vibrate) navigator.vibrate(20);
            snapTo(dx < 0 ? currentTabIndex + 1 : currentTabIndex - 1);
        } else {
            snapTo(currentTabIndex);
        }
    }, { passive: true });
})();


// --- Sidebar open / close ---
const sidebarDrawer = document.getElementById('sidebarDrawer');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const btnHamburger = document.getElementById('btnHamburger');

function openSidebar() {
    sidebarDrawer && sidebarDrawer.classList.add('open');
    sidebarOverlay && sidebarOverlay.classList.add('active');
    document.body.classList.add('sidebar-open');
}
function closeSidebar() {
    sidebarDrawer && sidebarDrawer.classList.remove('open');
    sidebarOverlay && sidebarOverlay.classList.remove('active');
    document.body.classList.remove('sidebar-open');
}

if (btnHamburger) btnHamburger.addEventListener('click', openSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

// Sidebar profile button → open profile drawer
const btnSidebarProfileOpen = document.getElementById('btnSidebarProfileOpen');
if (btnSidebarProfileOpen) {
    btnSidebarProfileOpen.addEventListener('click', () => {
        closeSidebar();
        if (typeof openProfileDrawer === 'function') openProfileDrawer();
    });
}

// Top bar profile button → open profile drawer
const btnProfileTop = document.getElementById('btnProfileIcon');
if (btnProfileTop) {
    btnProfileTop.addEventListener('click', () => {
        if (typeof openProfileDrawer === 'function') openProfileDrawer();
    });
}

// --- Load Google Avatar from Supabase session ---
function loadUserAvatarAndName(session) {
    if (!session) return;
    const meta = session.user?.user_metadata || {};
    const avatarUrl = meta.avatar_url || meta.picture || '';
    const name = meta.full_name || meta.name || 'Student';
    const email = session.user?.email || '';

    // Top bar avatar
    const topImg = document.getElementById('topAvatarImg');
    const topFallback = document.getElementById('topAvatarFallback');
    if (topImg && avatarUrl) {
        topImg.src = avatarUrl;
        topImg.style.display = 'block';
        if (topFallback) topFallback.style.display = 'none';
    }

    // Sidebar avatar + user info
    const sidebarImg = document.getElementById('sidebarAvatar');
    const sidebarFallback = document.getElementById('sidebarAvatarFallback');
    if (sidebarImg && avatarUrl) {
        sidebarImg.src = avatarUrl;
        sidebarImg.style.display = 'block';
        if (sidebarFallback) sidebarFallback.style.display = 'none';
    } else if (sidebarFallback) {
        sidebarFallback.style.display = 'flex';
    }

    const nameEl = document.getElementById('sidebarUserName');
    const emailEl = document.getElementById('sidebarUserEmail');
    if (nameEl) nameEl.textContent = name;
    if (emailEl) emailEl.textContent = email;
}

// --- Pull-to-Refresh (Sync Data) ---
const tableView = document.getElementById('tableView');

let pullStartY = 0;
let pullStartScroll = 0;
let isPulling = false;
const REFRESH_THRESHOLD = 80;

tableView.addEventListener('touchstart', e => {
    if (tableView.scrollTop === 0) {
        pullStartY = e.touches[0].clientY;
        pullStartScroll = tableView.scrollTop;
        isPulling = true;
    }
}, { passive: true });

tableView.addEventListener('touchmove', e => {
    if (!isPulling) return;
    
    const y = e.touches[0].clientY;
    const dy = y - pullStartY;
    
    // If pulling down while at the top
    if (dy > 0 && tableView.scrollTop === 0) {
        // Apply resistance
        const translateY = Math.min(dy * 0.4, REFRESH_THRESHOLD + 20);
        tableView.style.transform = `translateY(${translateY}px)`;
        
        // Optional: vibrate if we cross the threshold
        if (translateY >= REFRESH_THRESHOLD && navigator.vibrate) {
            navigator.vibrate(10);
        }
    } else {
        isPulling = false;
        tableView.style.transform = '';
    }
}, { passive: true });

tableView.addEventListener('touchend', e => {
    if (!isPulling) return;
    isPulling = false;
    
    const y = e.changedTouches[0].clientY;
    const dy = y - pullStartY;
    
    if (dy * 0.4 >= REFRESH_THRESHOLD) {
        // Threshold met: Trigger Sync
        tableView.style.transition = 'transform 0.3s ease';
        tableView.style.transform = `translateY(${REFRESH_THRESHOLD / 2}px)`; // Hold it open slightly
        
        if (typeof showToast === 'function') {
            showToast('🔄 Syncing with Cloud...', 'info');
        }
        
        // Sync and snap back
        if (typeof syncDataWithCloud === 'function') {
            syncDataWithCloud().finally(() => {
                setTimeout(() => {
                    tableView.style.transform = '';
                    setTimeout(() => tableView.style.transition = '', 300);
                }, 500);
            });
        }
    } else {
        // Snap back immediately
        tableView.style.transition = 'transform 0.3s ease';
        tableView.style.transform = '';
        setTimeout(() => tableView.style.transition = '', 300);
    }
}, { passive: true });

// --- STREAK UI UPDATE ---
function calcCurrentStreak() {
    if (!timeLogs || timeLogs.length === 0) return 0;
    // Get unique study days sorted descending
    const days = [...new Set(timeLogs.filter(l => !l.deleted).map(l => l.date))].sort().reverse();
    let streak = 0;
    let expected = getLocalDateStr(new Date());
    for (const day of days) {
        if (day === expected) {
            streak++;
            // Step back one calendar day
            const d = new Date(expected + 'T12:00:00');
            d.setDate(d.getDate() - 1);
            expected = getLocalDateStr(d);
        } else if (day < expected) {
            // Gap — check if yesterday was the start (allow today not yet logged)
            if (streak === 0) {
                // Still on today — allow yesterday as start
                const d = new Date(expected + 'T12:00:00');
                d.setDate(d.getDate() - 1);
                expected = getLocalDateStr(d);
                if (day === expected) {
                    streak++;
                    const d2 = new Date(expected + 'T12:00:00');
                    d2.setDate(d2.getDate() - 1);
                    expected = getLocalDateStr(d2);
                    continue;
                }
            }
            break;
        }
    }
    return streak;
}

function updateStreakUI() {
    const streakDays = calcCurrentStreak();
    
    // Sidebar streak
    const sBadge = document.getElementById('streakBadge');
    const sCount = document.getElementById('streakCount');
    if (sBadge && sCount) {
        sCount.textContent = streakDays;
        sBadge.style.display = 'inline-flex';
    }

    // Top bar streak — always show it
    const topBadge = document.getElementById('topBarStreak');
    const topCount = document.getElementById('topBarStreakCount');
    if (topBadge && topCount) {
        topCount.textContent = streakDays;
        topBadge.style.removeProperty('display'); // clear any inline hide
        topBadge.style.display = 'inline-flex';
    }
}


// ==========================================
// PWA INSTALLATION LOGIC
// ==========================================
let deferredPrompt;
const installBtn = document.getElementById('btnInstallPWA');

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Update UI notify the user they can install the PWA
    if (installBtn) {
        installBtn.style.display = 'flex';
    }
    console.log(`'beforeinstallprompt' event was fired.`);
});

if (installBtn) {
    installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        // We've used the prompt, and can't use it again, throw it away
        deferredPrompt = null;
        // Hide the button
        installBtn.style.display = 'none';
    });
}

window.addEventListener('appinstalled', () => {
    // Hide the app-provided install promotion
    if (installBtn) installBtn.style.display = 'none';
    // Clear the deferredPrompt so it can be garbage collected
    deferredPrompt = null;
    console.log('PWA was installed');
    showToast('HourForge installed successfully! 🎉', 'success');
});

// DOM Elements - Dashboard
const addSessionForm = document.getElementById('addSessionForm');
const todayRevisionList = document.getElementById('todayRevisionList');
const allTopicsList = document.getElementById('allTopicsList');
const dateReadInput = document.getElementById('dateRead');
const currentDateDisplay = document.getElementById('currentDateDisplay');
const filterBtns = document.querySelectorAll('.filter-btn');
const revisionTableBody = document.getElementById('revisionTableBody');

// ==========================================
// TOAST NOTIFICATION UTILITY
// ==========================================
function showToast(message, type = 'info') {
    const existing = document.querySelector('.st-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'st-toast';
    const colors = {
        success: { bg: 'rgba(16, 185, 129, 0.95)', icon: 'fa-circle-check' },
        error: { bg: 'rgba(239, 68, 68, 0.95)', icon: 'fa-circle-xmark' },
        warning: { bg: 'rgba(245, 158, 11, 0.95)', icon: 'fa-triangle-exclamation' },
        info: { bg: 'rgba(99, 102, 241, 0.95)', icon: 'fa-circle-info' }
    };
    const c = colors[type] || colors.info;
    toast.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        background: ${c.bg}; color: #fff; padding: 0.75rem 1.5rem;
        border-radius: 12px; font-size: 0.9rem; font-family: 'Outfit', sans-serif;
        z-index: 99999; display: flex; align-items: center; gap: 0.5rem;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3); backdrop-filter: blur(10px);
        animation: toastIn 0.4s ease;
    `;
    toast.innerHTML = `<i class="fa-solid ${c.icon}"></i> ${message}`;
    document.body.appendChild(toast);

    // Add animation keyframes if not present
    if (!document.getElementById('toastAnimStyle')) {
        const style = document.createElement('style');
        style.id = 'toastAnimStyle';
        style.textContent = `
            @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(-20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
            @keyframes toastOut { from { opacity: 1; transform: translateX(-50%) translateY(0); } to { opacity: 0; transform: translateX(-50%) translateY(-20px); } }
        `;
        document.head.appendChild(style);
    }

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.4s ease forwards';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// ==========================================
// PROFILE MODAL
// ==========================================
let _profileModalSubjects = []; // Temp state for subject tags in modal

function showProfileModal() {
    // Support both old modal (#profileModal) and current drawer (#profileDrawer)
    const modal = document.getElementById('profileModal');
    if (modal) modal.style.display = 'flex';
    // Always populate the form fields (they live in the profile drawer now)
    const profile = getProfile();
    const nameEl = document.getElementById('profileName');
    const gradeEl = document.getElementById('profileGrade');
    if (nameEl) nameEl.value = profile.name || '';
    if (gradeEl) gradeEl.value = profile.grade || '';

    // Handle custom faculty
    const customFacultyInput = document.getElementById('profileCustomFaculty');
    const facultyEl = document.getElementById('profileFaculty');
    if (facultyEl) {
        if (profile.faculty && !FACULTY_PRESETS[profile.faculty]) {
            facultyEl.value = 'Custom';
            if (customFacultyInput) { customFacultyInput.value = profile.faculty; customFacultyInput.style.display = 'block'; }
        } else {
            facultyEl.value = profile.faculty || '';
            if (customFacultyInput) { customFacultyInput.value = ''; customFacultyInput.style.display = profile.faculty === 'Custom' ? 'block' : 'none'; }
        }
    }
    const e1l = document.getElementById('profileExam1Label');
    const e1d = document.getElementById('profileExam1Date');
    const e2l = document.getElementById('profileExam2Label');
    const e2d = document.getElementById('profileExam2Date');
    if (e1l) e1l.value = profile.exam1Label || '';
    if (e1d) e1d.value = profile.exam1Date || '';
    if (e2l) e2l.value = profile.exam2Label || '';
    if (e2d) e2d.value = profile.exam2Date || '';

    _profileModalSubjects = [...(profile.subjects || [])];
    renderProfileSubjectTags();
}


// ==========================================
// STUDENT PROFILE DRAWER
// ==========================================
function openProfileDrawer() {
    showProfileModal(); // reuse existing init logic to populate the form
    const drawer = document.getElementById('profileDrawer');
    const overlay = document.getElementById('profileDrawerOverlay');
    if (drawer) drawer.classList.add('open');
    if (overlay) overlay.classList.add('active');
}

function closeProfileDrawer() {
    const drawer = document.getElementById('profileDrawer');
    const overlay = document.getElementById('profileDrawerOverlay');
    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
}

function renderProfileSubjectTags() {
    const container = document.getElementById('profileSubjectTags');
    if (!container) return;
    container.innerHTML = '';
    _profileModalSubjects.forEach((subj, i) => {
        const tag = document.createElement('span');
        tag.className = 'profile-subject-tag';
        tag.innerHTML = `${subj} <button type="button" class="tag-remove" data-index="${i}" title="Remove">&times;</button>`;
        tag.querySelector('.tag-remove').addEventListener('click', () => {
            _profileModalSubjects.splice(i, 1);
            renderProfileSubjectTags();
        });
        container.appendChild(tag);
    });
}

// Wire the drawer close buttons
document.getElementById('btnCloseProfile')?.addEventListener('click', closeProfileDrawer);
document.getElementById('profileDrawerOverlay')?.addEventListener('click', closeProfileDrawer);

// Top bar icon click handled early in the file, but just in case:
document.getElementById('btnProfileIcon')?.addEventListener('click', openProfileDrawer);
