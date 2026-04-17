
// ==========================================
// POMODORO TIMER LOGIC
// ==========================================
let pomoInterval = null;
let pomoMode = 'focus'; // 'focus' or 'short'
let isPomoRunning = false;
let pomoCurrentCycle = 1;
let isRingVisible = true;
let wakeLock = null;
let focusSessionStartedAt = null; // FAIR-PLAY: Timestamp when user hits 'Play' while in Focus mode
let accumulatedFocusMs = 0;       // FAIR-PLAY: Total milliseconds earned so far in the current focus block
let extraFocusMinutes = 0;      // BOOST: Extra minutes added via +5m button

// Read the real default from input immediately
function getInitialTime() {
    const focusEl = document.getElementById('pomoFocusMin');
    const shortEl = document.getElementById('pomoShortMin');
    const totalEl = document.getElementById('pomoTotalHours');
    
    // Restore from localStorage first if available locally
    if (focusEl && localStorage.getItem('pomoFocusMin')) focusEl.value = localStorage.getItem('pomoFocusMin');
    if (shortEl && localStorage.getItem('pomoShortMin')) shortEl.value = localStorage.getItem('pomoShortMin');
    if (totalEl && localStorage.getItem('pomoTotalHours')) totalEl.value = localStorage.getItem('pomoTotalHours');

    return focusEl ? parseInt(focusEl.value) * 60 : 50 * 60;
}
let pomoTimeLeft = getInitialTime();

const pomoTimeDisplay = document.getElementById('pomoTime');
const pomoRingFill = document.getElementById('pomoRingFill');
const pomoSessionCount = document.getElementById('pomoSessionCount');
const btnPomoStartPause = document.getElementById('btnPomoStartPause');
const pomoPlayIcon = document.getElementById('pomoPlayIcon');
const btnPomoPrev = document.getElementById('btnPomoPrev');
const btnPomoBack = document.getElementById('btnPomoBack');
const btnPomoSkip = document.getElementById('btnPomoSkip');
const btnPomoFullscreen = document.getElementById('btnPomoFullscreen');
const btnToggleRing = document.getElementById('btnToggleRing');
const pomoMiniTime = document.getElementById('pomoMiniTime');
const pomoMiniLabel = document.getElementById('pomoMiniLabel');
const pomoMiniPlay = document.getElementById('pomoMiniPlay');
const pomoMiniPlayIcon = document.getElementById('pomoMiniPlayIcon');
const pomoMiniTimer = document.getElementById('pomoMiniTimer');
const pomoFocusMin = document.getElementById('pomoFocusMin');
const pomoShortMin = document.getElementById('pomoShortMin');
const pomoTotalHours = document.getElementById('pomoTotalHours');

const btnFsPrev = document.getElementById('btnFsPrev');
const btnFsToggleRing = document.getElementById('btnFsToggleRing');
const btnFsPlayPause = document.getElementById('btnFsPlayPause');
const pomoFsPlayIcon = document.getElementById('pomoFsPlayIcon');
const btnFsBack = document.getElementById('btnFsBack');
const btnFsSkip = document.getElementById('btnFsSkip');
const fsCycleText = document.getElementById('fsCycleText');
const pomoFullscreenControls = document.getElementById('pomoFullscreenControls');
const btnFsExit = document.getElementById('btnFsExit');


// ===================== WAKE LOCK & BACKGROUND MEDIA =====================
let bgSessionAudio = null;

function initBgAudio() {
    if (bgSessionAudio) return;
    bgSessionAudio = document.getElementById('bgSessionAudio');
    if (bgSessionAudio) bgSessionAudio.muted = false; // MUST be false to register with OS MediaSession

    // ACTION HANDLERS ARE REQUIRED FOR THE NOTIFICATION TO APPEAR ON ANDROID/IOS!
    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => toggleTimerGlobal());
        navigator.mediaSession.setActionHandler('pause', () => toggleTimerGlobal());
    }
}

async function requestWakeLock() {
    // 1. MUST BE CALLED SYNCHRONOUSLY FIRST
    // Browsers block audio.play() if there's any await before it in a click handler
    initBgAudio();
    try {
        const playPromise = bgSessionAudio.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => console.log('Audio background failed:', e));
        }
    } catch(e) {}

    // 2. NOW we can do async wake lock
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
        } catch (e) {
            console.log('Wake lock failed:', e);
        }
    }
}

async function releaseWakeLock() {
    if (wakeLock) {
        try { await wakeLock.release(); } catch(e) {}
        wakeLock = null;
    }
    if (bgSessionAudio) {
        bgSessionAudio.pause();
    }
}

// Reacquire if page becomes visible again
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isPomoRunning) {
        requestWakeLock();
    }
});

// ===================== AUDIO =====================
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

// Crisp digital tick warning
function playTickCore(timeOffset) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime + timeOffset);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime + timeOffset);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + timeOffset + 0.1);
    
    osc.start(audioCtx.currentTime + timeOffset);
    osc.stop(audioCtx.currentTime + timeOffset + 0.15);
}

function playTick() {
    if (!audioCtx) return;
    playTickCore(0);
    playTickCore(0.5);
}

// Crisp digital alarm ring
function playRing() {
    if (!audioCtx) return;
    const time = audioCtx.currentTime;
    
    [0, 0.2, 0.4, 0.8, 1.0, 1.2].forEach(offset => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, time + offset);
        gain.gain.setValueAtTime(0.15, time + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, time + offset + 0.15);
        
        osc.start(time + offset);
        osc.stop(time + offset + 0.2);
    });
}

// ===================== UTILS =====================
function formatPomoTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function getTotalCycles() {
    const focusMin = parseInt(pomoFocusMin.value) || 50;
    const shortMin = parseInt(pomoShortMin.value) ?? 0; // allow 0 break
    const totalHr = parseFloat(pomoTotalHours.value) || 4;
    const cycleMin = focusMin + (isNaN(shortMin) ? 0 : shortMin);
    return Math.max(1, Math.floor((totalHr * 60) / cycleMin));
}

function updatePomoDisplay() {
    const formattedTime = formatPomoTime(pomoTimeLeft);
    if (pomoTimeDisplay) pomoTimeDisplay.textContent = formattedTime;
    if (pomoMiniTime) pomoMiniTime.textContent = formattedTime;
    if (pomoMiniLabel) pomoMiniLabel.textContent = pomoMode === 'focus' ? 'Focus' : 'Break';

    const totalTime = pomoMode === 'focus'
        ? parseInt(pomoFocusMin.value) * 60
        : parseInt(pomoShortMin.value) * 60;
        
    // --- BACKGROUND VISIBILITY (Tab Title & Lock Screen) ---
    const modeTitle = pomoMode === 'focus' ? 'Focus' : 'Break';
    
    // Only show timer in tab title if it's currently running or paused halfway
    if (isPomoRunning || pomoTimeLeft < totalTime) {
        document.title = `(${formattedTime}) ${modeTitle} - HourForge`;
    } else {
        document.title = "HourForge";
    }

    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: `${modeTitle}: ${formattedTime} left`,
            artist: 'HourForge Timer',
            album: `Cycle ${pomoCurrentCycle || 1} of ${getTotalCycles()}`,
            artwork: [
                { src: './icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: './icon-512.png', sizes: '512x512', type: 'image/png' }
            ]
        });

        // Set native OS scrubbing bar
        if ('setPositionState' in navigator.mediaSession) {
            try {
                navigator.mediaSession.setPositionState({
                    duration: totalTime > 0 ? totalTime : 1,
                    playbackRate: isPomoRunning ? 1 : 0,
                    position: Math.max(0, totalTime - pomoTimeLeft)
                });
            } catch(e) {}
        }
    }
    // --------------------------------------------------------

    const percentage = pomoTimeLeft / totalTime;
    const offset = 339.29 - (339.29 * percentage);
    if (pomoRingFill) {
        pomoRingFill.style.strokeDashoffset = offset;
        pomoRingFill.style.stroke = pomoMode === 'short' ? '#34d399' : '#ef4444';
    }

    if (pomoSessionCount) {
        const total = getTotalCycles();
        pomoSessionCount.textContent = `${Math.min(pomoCurrentCycle, total)} of ${total}`;
        if (fsCycleText) {
            fsCycleText.textContent = `${Math.min(pomoCurrentCycle, total)} of ${total}`;
        }
    }
}

// ===================== TIMER CORE =====================
function setPomoMode(mode, autoStart = false) {
    // FAIR-PLAY: Log any accumulated work before wiping the mode
    if (pomoMode === 'focus') {
        autoLogFocusSession();
    }

    pomoMode = mode;
    
    // Reset markers for the new mode setup
    accumulatedFocusMs = 0;
    extraFocusMinutes = 0;
    focusSessionStartedAt = null;

    document.querySelectorAll('.pomo-mode-btn[data-mode]').forEach(btn => btn.classList.remove('active'));
    const matchedBtn = document.querySelector(`.pomo-mode-btn[data-mode="${mode}"]`);
    if (matchedBtn) matchedBtn.classList.add('active');

    const label = document.getElementById('pomoModeLabel');
    if (label) label.textContent = mode === 'focus' ? 'Focus' : 'Break';

    const view = document.getElementById('pomodoroView');
    if (view) {
        view.classList.remove('mode-focus', 'mode-short');
        view.classList.add(`mode-${mode}`);
    }

    pomoTimeLeft = mode === 'focus'
        ? parseInt(pomoFocusMin.value) * 60
        : parseInt(pomoShortMin.value) * 60;

    updatePomoDisplay();
    startPomoTimer(autoStart);
}

function startPomoTimer(startPlaying = true) {
    clearInterval(pomoInterval);
    if (!startPlaying) {
        isPomoRunning = false;
        
        // FAIR-PLAY: On pause, save what was earned so far
        if (pomoMode === 'focus' && focusSessionStartedAt) {
            accumulatedFocusMs += (Date.now() - focusSessionStartedAt);
            focusSessionStartedAt = null;
        }

        if (pomoPlayIcon) pomoPlayIcon.className = 'fa-solid fa-play';
        if (pomoMiniPlayIcon) pomoMiniPlayIcon.className = 'fa-solid fa-play';
            if (pomoFsPlayIcon) pomoFsPlayIcon.className = 'fa-solid fa-play';
        releaseWakeLock();
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
        updatePomoDisplay(); // Ensures title updates properly when paused
        return;
    }

    // Request Notification permission so we can alert them when finished
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    initAudio();
    isPomoRunning = true;
    
    // FAIR-PLAY: Mark start time if in focus mode
    if (pomoMode === 'focus') {
        focusSessionStartedAt = Date.now();
    }

    if (pomoPlayIcon) pomoPlayIcon.className = 'fa-solid fa-pause';
    if (pomoMiniPlayIcon) pomoMiniPlayIcon.className = 'fa-solid fa-pause';
            if (pomoFsPlayIcon) pomoFsPlayIcon.className = 'fa-solid fa-pause';
    requestWakeLock();
    
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';

    // TIMESTAMP TIMER FIX: Calculate exact OS timestamp for when the timer should end.
    // This solves the bug where mobile browsers suspend `setInterval` in the background.
    const expectedEndTime = Date.now() + (pomoTimeLeft * 1000);

    pomoInterval = setInterval(() => {
        // Recalculate remaining seconds based on the pure clock, ignoring suspended intervals
        pomoTimeLeft = Math.ceil((expectedEndTime - Date.now()) / 1000);

        if (pomoTimeLeft <= 10 && pomoTimeLeft > 0) {
            playTick();
        }

        if (pomoTimeLeft <= 0) {
            pomoTimeLeft = 0; // Prevent negative flash on screen
            clearInterval(pomoInterval);
            playRing(); // Plays the digital alarm sound
            isPomoRunning = false;
            
            // OS-Level Push Notification when timer is up
            if ('Notification' in window && Notification.permission === 'granted') {
                try {
                    new Notification(pomoMode === 'focus' ? 'Focus Session Complete!' : 'Break Time Over!', {
                        body: pomoMode === 'focus' ? "Great job. It's time to take a break." : "Time to get back to work.",
                        icon: './icon-192.png',
                        vibrate: [200, 100, 200]
                    });
                } catch(e) { console.log('Notification failed', e); }
            }

            // AUTO-LOGGING: Only for Focus sessions
            if (pomoMode === 'focus') {
                autoLogFocusSession();
            }

            if (pomoPlayIcon) pomoPlayIcon.className = 'fa-solid fa-play';
            if (pomoMiniPlayIcon) pomoMiniPlayIcon.className = 'fa-solid fa-play';
            if (pomoFsPlayIcon) pomoFsPlayIcon.className = 'fa-solid fa-play';

            if (pomoMode === 'focus') {
                setPomoMode('short', true);
            } else {
                pomoCurrentCycle++;
                if (pomoCurrentCycle > getTotalCycles()) {
                    setPomoMode('focus', false);
                    pomoCurrentCycle = 1;
                    updatePomoDisplay();
                    releaseWakeLock();
                    document.title = "Timer Finished! - HourForge";
                } else {
                    setPomoMode('focus', true);
                }
            }
            return;
        }

        updatePomoDisplay();
    }, 1000);
}

function addPomoFiveMinutes() {
    if (pomoMode !== 'focus') return;
    
    // Increment both the time and the record
    pomoTimeLeft += 300; 
    extraFocusMinutes += 5;
    
    // RE-INIT TIMER: Re-calculate the expected end timestamp so background logic is accurate
    if (isPomoRunning) {
        startPomoTimer(true);
    } else {
        updatePomoDisplay();
    }
    
    if (typeof showToast === 'function') {
        showToast('Boosted: +5m Focus! 🚀', 'success');
    }
}

// ===================== EVENT LISTENERS =====================
document.querySelectorAll('.pomo-mode-btn[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => setPomoMode(btn.dataset.mode, false));
});

function handleToggleRing() {
    isRingVisible = !isRingVisible;
    const ring = document.querySelector('.pomo-ring');
    if (ring) ring.style.display = isRingVisible ? '' : 'none';
    const activeIcon = '<i class="fa-solid fa-bullseye"></i>';
    const inactiveIcon = '<i class="fa-regular fa-circle"></i>';
    if (btnToggleRing) btnToggleRing.innerHTML = isRingVisible ? activeIcon : inactiveIcon;
    if (btnFsToggleRing) btnFsToggleRing.innerHTML = isRingVisible ? activeIcon : inactiveIcon;
}

if (btnToggleRing) btnToggleRing.addEventListener('click', handleToggleRing);
if (btnFsToggleRing) btnFsToggleRing.addEventListener('click', handleToggleRing);

function toggleTimerGlobal() {
    if (isPomoRunning) startPomoTimer(false);
    else startPomoTimer(true);
}

if (btnPomoStartPause) btnPomoStartPause.addEventListener('click', toggleTimerGlobal);

if (btnFsPlayPause) btnFsPlayPause.addEventListener('click', toggleTimerGlobal);
if (btnFsPrev) btnFsPrev.addEventListener('click', () => setPomoMode(pomoMode, false));
if (btnFsSkip) {
    btnFsSkip.addEventListener('click', () => {
        if (pomoMode === 'focus') {
            setPomoMode('short', isPomoRunning);
        } else {
            pomoCurrentCycle++;
            if (pomoCurrentCycle > getTotalCycles()) {
                pomoCurrentCycle = 1;
                setPomoMode('focus', false);
            } else {
                setPomoMode('focus', isPomoRunning);
            }
        }
    });
}
if (btnFsBack) {
    btnFsBack.addEventListener('click', () => {
        if (pomoMode === 'short' || pomoMode === 'long') {
            setPomoMode('focus', isPomoRunning);
        } else {
            pomoCurrentCycle--;
            if (pomoCurrentCycle < 1) {
                pomoCurrentCycle = 1;
                setPomoMode('focus', false);
            } else {
                setPomoMode('short', isPomoRunning);
            }
        }
    });
}

if (pomoMiniPlay) pomoMiniPlay.addEventListener('click', toggleTimerGlobal);

const btnPomoAdd5 = document.getElementById('btnPomoAdd5');
if (btnPomoAdd5) btnPomoAdd5.addEventListener('click', addPomoFiveMinutes);

// SETTINGS PERSISTENCE: Save to localStorage on change
if (pomoFocusMin) {
    pomoFocusMin.addEventListener('change', () => {
        localStorage.setItem('pomoFocusMin', pomoFocusMin.value);
        if (!isPomoRunning) pomoTimeLeft = getInitialTime();
        updatePomoDisplay();
    });
}
if (pomoShortMin) {
    pomoShortMin.addEventListener('change', () => {
        localStorage.setItem('pomoShortMin', pomoShortMin.value);
        if (!isPomoRunning) pomoTimeLeft = getInitialTime();
        updatePomoDisplay();
    });
}
if (pomoTotalHours) {
    pomoTotalHours.addEventListener('change', () => {
        localStorage.setItem('pomoTotalHours', pomoTotalHours.value);
        updatePomoDisplay();
    });
}

if (btnPomoPrev) {
    btnPomoPrev.addEventListener('click', () => setPomoMode(pomoMode, false));
}

if (btnPomoSkip) {
    btnPomoSkip.addEventListener('click', () => {
        if (pomoMode === 'focus') {
            setPomoMode('short', isPomoRunning);
        } else {
            pomoCurrentCycle++;
            if (pomoCurrentCycle > getTotalCycles()) {
                pomoCurrentCycle = 1;
                setPomoMode('focus', false);
            } else {
                setPomoMode('focus', isPomoRunning);
            }
        }
    });
}
if (btnPomoBack) {
    btnPomoBack.addEventListener('click', () => {
        if (pomoMode === 'short' || pomoMode === 'long') {
            setPomoMode('focus', isPomoRunning);
        } else {
            pomoCurrentCycle--;
            if (pomoCurrentCycle < 1) {
                pomoCurrentCycle = 1;
                setPomoMode('focus', false);
            } else {
                setPomoMode('short', isPomoRunning);
            }
        }
    });
}

[pomoFocusMin, pomoShortMin, pomoTotalHours].forEach(input => {
    if (input) {
        input.addEventListener('change', () => {
            if (pomoFocusMin) localStorage.setItem('pomoFocusMin', pomoFocusMin.value);
            if (pomoShortMin) localStorage.setItem('pomoShortMin', pomoShortMin.value);
            if (pomoTotalHours) localStorage.setItem('pomoTotalHours', pomoTotalHours.value);
            
            if (typeof uploadDataToCloud === 'function') uploadDataToCloud();
            
            pomoCurrentCycle = 1;
            setPomoMode('focus', false);
        });
    }
});

// ===================== FULLSCREEN + IDLE FADE =====================
let fsIdleTimer;
let _lastTouchTime = 0; // tracks last touch so mousemove guard can filter mobile synthetic events
const pomodoroView = document.getElementById('pomodoroView');

// Helper: returns true if we're in either native fullscreen OR CSS mobile fullscreen
function isInFullscreen() {
    return !!document.fullscreenElement || (pomodoroView && pomodoroView.classList.contains('is-pomo-fs'));
}

function showFsControls() {
    if (pomodoroView) pomodoroView.classList.remove('fullscreen-idle');
    if (pomoFullscreenControls) {
        pomoFullscreenControls.classList.remove('fs-hidden');
        pomoFullscreenControls.classList.add('fs-visible');
    }
}

function hideFsControls() {
    if (pomodoroView) pomodoroView.classList.add('fullscreen-idle');
    if (pomoFullscreenControls) {
        pomoFullscreenControls.classList.remove('fs-visible');
        pomoFullscreenControls.classList.add('fs-hidden');
    }
}

function resetFsIdle() {
    if (!isInFullscreen()) return;
    showFsControls();
    clearTimeout(fsIdleTimer);
    fsIdleTimer = setTimeout(hideFsControls, 3000);
}

if (pomodoroView) {
    // Desktop only: mouse movement shows controls and resets auto-hide
    // GUARD: Mobile Chrome synthesizes a fake 'mousemove' after every touch tap
    // which would immediately re-show controls we just hid. Ignore it.
    pomodoroView.addEventListener('mousemove', (e) => {
        // If a touchstart fired in the last 800ms, this is a synthetic event — skip it
        if (Date.now() - _lastTouchTime < 800) return;
        resetFsIdle();
    });

    // Timestamp guard to prevent the same tap firing BOTH touchstart AND click
    let _lastTouchHandled = 0;

    // Core toggle logic
    function handleFsTap(e) {
        if (!isInFullscreen()) return;

        // ONLY skip if the user tapped an actual interactive button
        // (Don't skip for the controls panel container — that would block hiding)
        if (e.target.closest('button')) {
            resetFsIdle();
            return;
        }

        // Toggle: any tap on non-button area hides/shows controls
        const isVisible = pomoFullscreenControls && pomoFullscreenControls.classList.contains('fs-visible');
        if (isVisible) {
            clearTimeout(fsIdleTimer);
            hideFsControls();
        } else {
            resetFsIdle();
        }
    }

    // Mobile: touchstart fires first — mark the time and handle it
    pomodoroView.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return; // ignore multi-finger
        _lastTouchTime = Date.now();     // for mousemove synthetic event guard
        _lastTouchHandled = Date.now(); // for click dedup guard
        handleFsTap(e);
    }, { passive: true });

    // Desktop: click — but skip if touchstart just handled this same tap
    pomodoroView.addEventListener('click', (e) => {
        if (Date.now() - _lastTouchHandled < 500) return; // already handled by touchstart
        handleFsTap(e);
    });
}

document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        if (pomodoroView) pomodoroView.classList.remove('fullscreen-idle');
        clearTimeout(fsIdleTimer);
    } else {
        resetFsIdle();
    }
});


if (btnPomoFullscreen) {
    btnPomoFullscreen.addEventListener('click', () => {
        // Try native fullscreen (desktop) first
        if (!document.fullscreenElement) {
            pomodoroView.requestFullscreen().then(() => {
                // DO NOT lock orientation — let the device auto-rotate freely
                resetFsIdle();
            }).catch(() => {
                // MOBILE FALLBACK: If native fullscreen isn't supported, use CSS class
                pomodoroView.classList.add('is-pomo-fs');
                document.body.classList.add('pomo-fs-active');
                resetFsIdle();
            });
        } else {
            document.exitFullscreen();
        }
    });
}

if (btnFsExit) {
    btnFsExit.addEventListener('click', () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            // Mobile: remove CSS fallback fullscreen
            pomodoroView.classList.remove('is-pomo-fs', 'fullscreen-idle');
            document.body.classList.remove('pomo-fs-active');
            clearTimeout(fsIdleTimer);
        }
    });
}

// ===================== STUDY CONTEXT & AUTO-LOGGING =====================
const pomoTaskInput = document.getElementById('pomoTaskInput');
const pomoSubjectSelect = document.getElementById('pomoSubjectSelect');
const pomoSubjectChips = document.getElementById('pomoSubjectChips');

function renderPomoSubjectChips() {
    if (!pomoSubjectChips) return;
    const subjects = typeof getSubjects === 'function' ? getSubjects() : [];
    
    // We only re-render if the number of subjects changed or it's empty
    // to avoid layout shifts while typing/using
    if (pomoSubjectChips.dataset.count == subjects.length + 1) return;
    pomoSubjectChips.dataset.count = subjects.length + 1;

    pomoSubjectChips.innerHTML = '';

    // Add "General" chip
    const generalChip = createPomoChip('General', '');
    pomoSubjectChips.appendChild(generalChip);

    subjects.forEach(s => {
        const chip = createPomoChip(s, s);
        pomoSubjectChips.appendChild(chip);
    });

    syncPomoChipActiveState();
}

function createPomoChip(label, value) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'pomo-context-chip';
    
    // Check if it's the active one to set initial style
    const currentSubject = localStorage.getItem('pomoSubject') || '';
    const isActive = value === currentSubject;

    chip.style.cssText = `
        background: ${isActive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
        border: 1px solid ${isActive ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'};
        color: ${isActive ? 'white' : 'var(--text-secondary)'};
        padding: 0.45rem 1.1rem;
        border-radius: 2rem;
        font-size: 0.82rem;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        flex-shrink: 0;
        font-weight: 500;
        letter-spacing: 0.3px;
    `;
    chip.textContent = label;
    chip.dataset.value = value;

    chip.addEventListener('click', () => {
        if (pomoSubjectSelect) pomoSubjectSelect.value = value;
        localStorage.setItem('pomoSubject', value);
        syncPomoChipActiveState();
        if (navigator.vibrate) navigator.vibrate(12);
    });

    return chip;
}

function syncPomoChipActiveState() {
    const currentSubject = localStorage.getItem('pomoSubject') || '';
    if (pomoSubjectSelect) pomoSubjectSelect.value = currentSubject;

    document.querySelectorAll('.pomo-context-chip').forEach(chip => {
        const isActive = chip.dataset.value === currentSubject;
        chip.style.background = isActive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)';
        chip.style.borderColor = isActive ? '#ef4444' : 'rgba(255, 255, 255, 0.1)';
        chip.style.color = isActive ? 'white' : 'var(--text-secondary)';
    });
}

function autoLogFocusSession() {
    // Determine the actual minutes studied
    let finalFocusMs = accumulatedFocusMs;
    // If it's still running, add the drift from current tick
    if (focusSessionStartedAt) {
        finalFocusMs += (Date.now() - focusSessionStartedAt);
    }

    const actualMinutes = Math.floor(finalFocusMs / (1000 * 60));
    
    // FAIR-PLAY THRESHOLD: Must be at least 5 minutes to count for partial credit
    // (If the timer finished naturally, we always log)
    if (pomoTimeLeft > 0 && actualMinutes < 5) {
        console.log(`Fair Play: Session too short for partial credit (${actualMinutes}m)`);
        // We still reset markers to avoid "carry over" cheating
        accumulatedFocusMs = 0;
        focusSessionStartedAt = isPomoRunning ? Date.now() : null;
        return; 
    }

    // Safety: If somehow 0 mins, don't log anything
    if (actualMinutes === 0 && pomoTimeLeft > 0) return;

    const taskName = (pomoTaskInput?.value.trim()) || 'Focus Session';
    const subject = pomoSubjectSelect?.value || '';
    
    // If timer finished naturally, use the scheduled minutes + extra boost
    const logMinutes = (pomoTimeLeft <= 0) 
        ? ((parseInt(pomoFocusMin?.value) || 50) + extraFocusMinutes) 
        : actualMinutes;

    // Calculate start/end times
    const now = new Date();
    const startTimeDate = new Date(now.getTime() - (logMinutes * 60 * 1000));
    
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const startTimeStr = `${String(startTimeDate.getHours()).padStart(2, '0')}:${String(startTimeDate.getMinutes()).padStart(2, '0')}`;
    const endTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (typeof addTimeLogEntry === 'function') {
        const isPartial = pomoTimeLeft > 0;
        const notes = isPartial ? 'Partially earned via Pomodoro.' : 'Earned via Pomodoro focus session.';
        
        const success = addTimeLogEntry(taskName, subject, startTimeStr, endTimeStr, dateStr, notes);
        if (success && typeof showToast === 'function') {
            const msg = isPartial ? `Partial session logged! +${logMinutes}m` : `Focus session logged! +${logMinutes}m`;
            showToast(`${msg} to ${subject || 'General'} 🏆`, 'success');
        }
    }

    // Reset markers after logging
    accumulatedFocusMs = 0;
    focusSessionStartedAt = isPomoRunning ? Date.now() : null;
}

// Persist task input
if (pomoTaskInput) {
    pomoTaskInput.value = localStorage.getItem('pomoTask') || '';
    pomoTaskInput.addEventListener('input', () => {
        localStorage.setItem('pomoTask', pomoTaskInput.value);
    });
}

// Initial chip render
renderPomoSubjectChips();

// Re-render chips periodically or when specific tabs are clicked to ensure sync
setInterval(renderPomoSubjectChips, 10000);

// Initial display — runs synchronously after inputs are in DOM
updatePomoDisplay();