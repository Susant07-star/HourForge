import os

index_path = 'd:\\Productivity\\StudyTracker\\index.html'
style_path = 'd:\\Productivity\\StudyTracker\\style.css'
script_path = 'd:\\Productivity\\StudyTracker\\script.js'

# --- 1. UPDATE index.html ---
with open(index_path, 'r', encoding='utf-8') as f:
    html = f.read()

floating_controls = """
            <!-- ========= FULLSCREEN FLOATING CONTROLS ========= -->
            <div id="pomoFullscreenControls" class="fs-visible">
                <button id="btnFsPrev" class="pomo-ctrl-btn" title="Reset"><i class="fa-solid fa-rotate-left"></i></button>
                <button id="btnFsPlayPause" class="pomo-ctrl-btn pomo-main-btn"><i class="fa-solid fa-play" id="pomoFsPlayIcon"></i></button>
                <button id="btnFsSkip" class="pomo-ctrl-btn" title="Skip"><i class="fa-solid fa-forward"></i></button>
                <div class="fs-cycle-text" id="fsCycleText">1 of 4</div>
            </div>
"""

if '<!-- ========= FULLSCREEN FLOATING' not in html:
    html = html.replace('        </div>\n    </main>', floating_controls + '        </div>\n    </main>')
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(html)


# --- 2. UPDATE style.css ---
with open(style_path, 'r', encoding='utf-8') as f:
    css = f.read()

floating_css = """
/* Show floating controls div only in fullscreen */
:fullscreen #pomoFullscreenControls,
:-webkit-full-screen #pomoFullscreenControls {
    display: flex !important;
}

#pomoFullscreenControls {
    position: fixed;
    bottom: 3rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 99999;
    display: none; /* only shown in fullscreen */
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 3rem;
    padding: 1rem 2rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    transition: opacity 0.4s ease, transform 0.4s ease;
}

#pomoFullscreenControls.fs-visible {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
    pointer-events: auto;
}

.fs-cycle-text {
    color: var(--accent-primary);
    font-size: 1.1rem;
    font-weight: bold;
    margin-left: 0.5rem;
}

#pomodoroView:fullscreen .pomo-controls,
#pomodoroView:-webkit-full-screen .pomo-controls {
    display: none !important;
}

#pomodoroView.fullscreen-idle #pomoFullscreenControls {
    opacity: 0 !important;
    transform: translateX(-50%) translateY(20px) !important;
    pointer-events: none !important;
}

/* Also hide top header stuff in fullscreen */
#pomodoroView:fullscreen .header-icon-group,
#pomodoroView:-webkit-full-screen .header-icon-group {
    display: none !important;
}
"""

if '#pomoFullscreenControls' not in css:
    css += floating_css
    with open(style_path, 'w', encoding='utf-8') as f:
        f.write(css)


# --- 3. UPDATE script.js ---
with open(script_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Add DOM elements
dom_additions = """
const btnFsPrev = document.getElementById('btnFsPrev');
const btnFsPlayPause = document.getElementById('btnFsPlayPause');
const pomoFsPlayIcon = document.getElementById('pomoFsPlayIcon');
const btnFsSkip = document.getElementById('btnFsSkip');
const fsCycleText = document.getElementById('fsCycleText');
const pomoFullscreenControls = document.getElementById('pomoFullscreenControls');
"""
if 'const btnFsPrev' not in js:
    js = js.replace('const pomoTotalHours = document.getElementById(\'pomoTotalHours\');', 'const pomoTotalHours = document.getElementById(\'pomoTotalHours\');\n' + dom_additions)

# Update Display with fs cycle text
if 'if (fsCycleText)' not in js:
    # Need to make sure total is defined
    update_str = """
    if (pomoSessionCount) {
        const total = getTotalCycles();
        pomoSessionCount.textContent = `${Math.min(pomoCurrentCycle, total)} of ${total}`;
    }"""
    replacement_str = """
    if (pomoSessionCount) {
        const total = getTotalCycles();
        pomoSessionCount.textContent = `${Math.min(pomoCurrentCycle, total)} of ${total}`;
        if (fsCycleText) {
            fsCycleText.textContent = `${Math.min(pomoCurrentCycle, total)} of ${total}`;
        }
    }"""
    js = js.replace(update_str, replacement_str)

# Update Play Icons
if 'if (pomoFsPlayIcon)' not in js:
    js = js.replace("if (pomoMiniPlayIcon) pomoMiniPlayIcon.className = 'fa-solid fa-play';", "if (pomoMiniPlayIcon) pomoMiniPlayIcon.className = 'fa-solid fa-play';\n            if (pomoFsPlayIcon) pomoFsPlayIcon.className = 'fa-solid fa-play';")
    js = js.replace("if (pomoMiniPlayIcon) pomoMiniPlayIcon.className = 'fa-solid fa-pause';", "if (pomoMiniPlayIcon) pomoMiniPlayIcon.className = 'fa-solid fa-pause';\n            if (pomoFsPlayIcon) pomoFsPlayIcon.className = 'fa-solid fa-pause';")

# Add Event listeners
events_additions = """
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
"""
if 'if (btnFsPlayPause)' not in js:
    js = js.replace("if (btnPomoStartPause) btnPomoStartPause.addEventListener('click', toggleTimerGlobal);", "if (btnPomoStartPause) btnPomoStartPause.addEventListener('click', toggleTimerGlobal);\n" + events_additions)


# Update resetFsIdle logic to also slide controls back out and toggle visibility properly.
if 'pomoFullscreenControls.classList.add' not in js:
    new_reset_fs_idle = """
function resetFsIdle() {
    if (!document.fullscreenElement) return;
    pomodoroView.classList.remove('fullscreen-idle');
    if (pomoFullscreenControls) {
        pomoFullscreenControls.classList.remove('fs-hidden');
        pomoFullscreenControls.classList.add('fs-visible');
    }
    clearTimeout(fsIdleTimer);
    fsIdleTimer = setTimeout(() => {
        pomodoroView.classList.add('fullscreen-idle');
        if (pomoFullscreenControls) {
            pomoFullscreenControls.classList.remove('fs-visible');
            pomoFullscreenControls.classList.add('fs-hidden');
        }
    }, 3000);
}
"""
    old_reset_fs_idle = """
function resetFsIdle() {
    if (!document.fullscreenElement) return;
    pomodoroView.classList.remove('fullscreen-idle');
    clearTimeout(fsIdleTimer);
    fsIdleTimer = setTimeout(() => {
        pomodoroView.classList.add('fullscreen-idle');
    }, 3000);
}
"""
    js = js.replace(old_reset_fs_idle, new_reset_fs_idle)


try:
    with open(script_path, 'w', encoding='utf-8') as f:
        f.write(js)
    print("Done wrapping up script.")
except Exception as e:
    print(e)
