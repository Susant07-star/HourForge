
// ==========================================
// SUPABASE: CLIENT INITIALIZATION
// ==========================================
const supabaseUrl = 'https://dkhofhvqjhpwhmurlmtj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRraG9maHZxamhwd2htdXJsbXRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NzU4OTgsImV4cCI6MjA4ODQ1MTg5OH0.5PNGiH4UdL0LEeIjf8gJV9sNkZecxN8M8wcamjqsjn4';
const supabaseClient = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    },
    // Force HTTP/1.1 or HTTP/2 to avoid Chrome's experimental QUIC protocol issues
    // by explicitly setting headers or just relying on browser fallback.
    // However, Supabase-js doesn't expose low-level fetch options easily.
    // The best fix for ERR_QUIC_PROTOCOL_ERROR is usually client-side network stability 
    // or disabling QUIC in browser, but we can try to be more robust.
}) : null;

let currentSession = null;

// ==========================================
// SUPABASE: AUTH & CLOUD SYNC UI HANDLERS
// ==========================================

// Helper: Restore last active tab and render it immediately
function restoreSavedTab() {
    try {
        const savedTab = localStorage.getItem('activeTab');
        if (savedTab && document.getElementById(savedTab)) {
            switchTab(savedTab, false);
            // Force immediate render of the restored view using local data
            if (savedTab === 'hourLogView' && typeof renderTimeLogs === 'function') renderTimeLogs();
            else if (savedTab === 'tableView' && typeof renderTableView === 'function') renderTableView();
            else if (savedTab === 'dashboardView' && typeof renderDashboard === 'function') renderDashboard();
        } else {
            if (typeof renderDashboard === 'function') renderDashboard();
        }
    } catch (e) {
        console.warn('Tab restoration failed, defaulting to Dashboard:', e);
        if (typeof renderDashboard === 'function') renderDashboard();
    }
}

// Helper: dismisses the auth loader and shows either the gate or the app
function resolveAuthUI(hasSession) {
    const loader = document.getElementById('authLoader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => { loader.style.display = 'none'; }, 300);
    }
    updateAuthUI();
}

// Hard failsafe: if Supabase hasn't resolved in 2.5s, boot locally
const authFallbackTimer = setTimeout(() => {
    if (!isAppInitialized) {
        console.warn('⚠️ Supabase auth timeout — booting from local data');
        resolveAuthUI(false);
        const gate = document.getElementById('loginGate');
        const app = document.getElementById('mainAppContainer');
        // If there's a locally cached session hint, show app; otherwise show gate
        const hasLocalHint = !!localStorage.getItem('supabase.auth.token') ||
                              !!sessionStorage.getItem('supabase.auth.token') ||
                              [...Object.keys(localStorage)].some(k => k.startsWith('sb-'));
        if (hasLocalHint) {
            if (gate) gate.style.display = 'none';
            if (app) app.style.display = 'block';
            restoreSavedTab();
            init();
            isAppInitialized = true;
        } else {
            if (gate) gate.style.display = 'flex';
            if (app) app.style.display = 'none';
        }
    }
}, 2500);

if (supabaseClient) {
    // onAuthStateChange is the SINGLE source of truth for auth state.
    // Supabase v2 guarantees it fires once on page load with event 'INITIAL_SESSION'.
    // We do NOT call getSession() separately — that caused the race condition / random logouts.
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        clearTimeout(authFallbackTimer); // Auth resolved — cancel the failsafe

        const prevSession = currentSession;
        currentSession = session;

        if (event === 'INITIAL_SESSION') {
            // Page load: Supabase has restored (or confirmed absence of) session from storage
            resolveAuthUI(!!session);
            loadUserAvatarAndName(session);
            if (session) {
                await syncDataWithCloud(true);
                setupRealtimeSubscription(session.user.id);
            } else if (!isAppInitialized) {
                // Not signed in — show login gate (already handled by resolveAuthUI → updateAuthUI)
                // Still initialize app so offline/local data works if they close the gate
                setTimeout(() => {
                    if (!isAppInitialized) { init(); isAppInitialized = true; }
                }, 800);
            }
        } else if (event === 'SIGNED_IN') {
            // Explicit sign-in (OAuth redirect or email)
            resolveAuthUI(true);
            loadUserAvatarAndName(session);
            if (!prevSession) {
                await syncDataWithCloud(true);
                setupRealtimeSubscription(session.user.id);
            }
        } else if (event === 'SIGNED_OUT') {
            resolveAuthUI(false);
            teardownRealtimeSubscription();
        } else if (event === 'TOKEN_REFRESHED') {
            // Silent token refresh — don't re-init the app, just update session reference
            currentSession = session;
        }
    });
} else {
    // Supabase CDN failed to load — bypass login gate and boot app from local data
    clearTimeout(authFallbackTimer);
    console.warn('⚠️ Supabase unavailable. Booting in offline mode.');
    const loader = document.getElementById('authLoader');
    if (loader) loader.style.display = 'none';
    const gate = document.getElementById('loginGate');
    const app = document.getElementById('mainAppContainer');
    if (gate) gate.style.display = 'none';
    if (app) app.style.display = 'block';
    restoreSavedTab();
    setTimeout(() => {
        if (!isAppInitialized) { init(); isAppInitialized = true; }
    }, 100);
}

// --- Supabase Realtime Sync ---

function deepMergeArrays(localArr, cloudArr) {
    if (!localArr) localArr = [];
    if (!cloudArr) cloudArr = [];
    const map = new Map();
    // Add all local items
    for (const item of localArr) {
        if (item.id) map.set(item.id, item);
    }
    // Merge cloud items
    for (const item of cloudArr) {
        if (item.id) {
            const existing = map.get(item.id);
            if (!existing) {
                map.set(item.id, item);
            } else {
                // If both exist, pick the newest one based on timestamps
                const getLatestStamp = (obj) => {
                    let latest = obj.createdAt ? new Date(obj.createdAt).getTime() : 0;
                    if (obj.updatedAt) latest = Math.max(latest, new Date(obj.updatedAt).getTime());
                    if (obj.revisions) {
                        for (const rev of Object.values(obj.revisions)) {
                            if (rev && typeof rev === 'object' && rev.completedAt) {
                                latest = Math.max(latest, new Date(rev.completedAt).getTime());
                            }
                        }
                    }
                    return latest;
                };
                
                const localStr = JSON.stringify(existing);
                const cloudStr = JSON.stringify(item);
                
                if (localStr === cloudStr) continue;
                
                const localDate = getLatestStamp(existing);
                const cloudDate = getLatestStamp(item);
                // #region agent log
                if (existing && item && (existing.updated_at || item.updated_at) && !(existing.updatedAt || item.updatedAt)) {
                    fetch('http://127.0.0.1:7317/ingest/ebb4b885-2dc8-4803-826d-97791a2423c5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'130ae0'},body:JSON.stringify({sessionId:'130ae0',runId:'pre-fix',hypothesisId:'H2',location:'js/supabase.js:deepMergeArrays',message:'Merge comparing without camelCase timestamps',data:{id:item.id,localDate,cloudDate,localHasUpdatedAt:!!existing.updatedAt,cloudHasUpdatedAt:!!item.updatedAt,localHasUpdated_at:!!existing.updated_at,cloudHasUpdated_at:!!item.updated_at},timestamp:Date.now()})}).catch(()=>{});
                }
                // #endregion
                
                if (cloudDate > localDate) {
                    map.set(item.id, item);
                } else if (cloudDate === localDate) {
                    if (cloudStr.length > localStr.length) {
                        map.set(item.id, item);
                    }
                }
            }
        }
    }
    return Array.from(map.values()).sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; 
    });
}

async function applyCloudData(cloudData) {
    if (!cloudData) return;
    
    // Save to local vars
    if (cloudData.profile) saveProfile(cloudData.profile);
    
    // Deep Merge Arrays instead of overwriting
    studySessions = deepMergeArrays(studySessions, cloudData.studySessions);
    timeLogs = deepMergeArrays(timeLogs, cloudData.timeLogs);
    
    // Merge AI Ratings
    const mergedAI = [...(cloudData.aiRatingsHistory || []), ...aiRatingsHistory];
    const aiMap = {};
    mergedAI.forEach(r => {
        const key = `${r.dateLabel}_${r.period}`;
        if (!aiMap[key] || r.timestamp > aiMap[key].timestamp) {
            aiMap[key] = r;
        }
    });
    aiRatingsHistory = Object.values(aiMap);
    
    // Timer Settings
    if (cloudData.pomoSettings) {
        if (document.getElementById('pomoFocusMin')) document.getElementById('pomoFocusMin').value = cloudData.pomoSettings.focusMin || 50;
        if (document.getElementById('pomoShortMin')) document.getElementById('pomoShortMin').value = cloudData.pomoSettings.shortMin || 10;
        if (document.getElementById('pomoTotalHours')) document.getElementById('pomoTotalHours').value = cloudData.pomoSettings.totalHours || 4;
        localStorage.setItem('pomoFocusMin', cloudData.pomoSettings.focusMin);
        localStorage.setItem('pomoShortMin', cloudData.pomoSettings.shortMin);
        localStorage.setItem('pomoTotalHours', cloudData.pomoSettings.totalHours);
        
        if (typeof getInitialTime === 'function' && !isPomoRunning) {
            pomoTimeLeft = getInitialTime();
            if (typeof updatePomoDisplay === 'function') updatePomoDisplay();
        }
    }
    
    // Save to LocalStorage
    localStorage.setItem('studySessions', JSON.stringify(studySessions));
    localStorage.setItem('timeLogs', JSON.stringify(timeLogs));
    localStorage.setItem('aiRatingsHistory', JSON.stringify(aiRatingsHistory));
    if(cloudData.dbMigrationDone) localStorage.setItem('dbMigrationDone', cloudData.dbMigrationDone);

    // Update IDB mirror
    await idb.set('studySessions', studySessions).catch(()=>{});
    await idb.set('timeLogs', timeLogs).catch(()=>{});

    // Re-render UI aggressively if app is already initialized
    if (isAppInitialized) {
        renderDynamicSubjects();
        renderDashboard();
        renderTableView();
        if (typeof renderTimeLogs === 'function') renderTimeLogs();
        if (typeof updateExamCountdowns === 'function') updateExamCountdowns();
        if (typeof updateExamCountdown === 'function') updateExamCountdown(); // fallback
        if (typeof updateStreakUI === 'function') updateStreakUI();
    }
}

function setupRealtimeSubscription(userId) {
    if (!supabaseClient || realtimeChannel) return;
    realtimeChannel = supabaseClient.channel('custom-user-data-channel')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_data', filter: `user_id=eq.${userId}` },
        async (payload) => {
            console.log("🔄 Realtime update received from another device/tab:", payload);
            if (payload.new && payload.new.data) {
                await applyCloudData(payload.new.data);
                showToast("Data synced from cloud! ☁️", "success");
            }
        }
      )
      .subscribe();
}

function teardownRealtimeSubscription() {
    if (realtimeChannel) {
        supabaseClient.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }
}

async function syncDataWithCloud(isInitialLoad = false) {
    if (!supabaseClient || !currentSession) return;
    
    try {
        console.log("☁️ Syncing with Supabase Cloud...");
        const userId = currentSession.user.id;
        
        // Timeout helper — if Supabase hangs for 4s, abort and boot locally
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Supabase timeout')), 3000)
        );

        // 1. Fetch Cloud Data (race against timeout)
        const { data: cloudRow, error: fetchErr } = await Promise.race([
            supabaseClient
                .from('user_data')
                .select('data, updated_at')
                .eq('user_id', userId)
                .single(),
            timeout.then(() => ({ data: null, error: { code: 'TIMEOUT' } }))
        ]);

        if (fetchErr && fetchErr.code !== 'PGRST116') { // Ignore "Rows not found" error
            console.error("Cloud Fetch Error:", fetchErr);
            if (isInitialLoad && !isAppInitialized) {
                init(); // Fallback: load local if fetch fails
                isAppInitialized = true;
            }
            return;
        }

        // 2. Perform Deep Merge of Data
        if (cloudRow && cloudRow.data) {
            console.log("☁️ Merging Cloud Data with Local Data...");
            await applyCloudData(cloudRow.data);
            // No toast here — this runs silently on every refresh and would be annoying.
        }

        // Initialize App UI now that data is ready (only on initial load)
        if (isInitialLoad && !isAppInitialized) {
            init();
            isAppInitialized = true;
        }

        // 3. Upload merged outcome back to cloud to keep cloud mathematically aligned
        uploadDataToCloud();

    } catch (e) {
        console.error("Sync caught error:", e);
        if (isInitialLoad && !isAppInitialized) {
            init(); // MUST FALLBACK ON EXCEPTION TOO
            isAppInitialized = true;
        }
    }
}

// Fire and Forget Upload Function (throttled locally in practice, but called on data mutations)
async function uploadDataToCloud() {
    if (!supabaseClient || !currentSession) return;
    try {
        console.log("☁️ Uploading Local to Cloud...");
        const payload = {
            user_id: currentSession.user.id,
            updated_at: new Date().toISOString(),
            data: {
                profile: getProfile(),
                studySessions,
                timeLogs,
                aiRatingsHistory,
                pomoSettings: {
                    focusMin: document.getElementById('pomoFocusMin')?.value || 50,
                    shortMin: document.getElementById('pomoShortMin')?.value || 10,
                    totalHours: document.getElementById('pomoTotalHours')?.value || 4
                },
                dbMigrationDone: localStorage.getItem('dbMigrationDone')
            }
        };

        const { error } = await supabaseClient.from('user_data').upsert(payload, { onConflict: 'user_id' });
        
        if (error) {
            console.warn("Cloud Upload Failed (will retry later):", error.message);
        } else {
            console.log("☁️ Upload Success.");
        }
    } catch (e) {
        console.warn("Cloud Upload Exception:", e);
    }
}

// ==========================================
// SUPABASE: MANDATORY GOOGLE AUTH
// ==========================================
const loginGate = document.getElementById('loginGate');
const mainAppContainer = document.getElementById('mainAppContainer');
const btnGoogleSignIn = document.getElementById('btnGoogleSignIn');
const btnSignOutIcon = document.getElementById('btnSignOutIcon');

if (btnGoogleSignIn) {
    btnGoogleSignIn.addEventListener('click', async () => {
        if (!supabaseClient) return;
        btnGoogleSignIn.disabled = true;
        btnGoogleSignIn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Connecting...';
        
        try {
            const { data, error } = await supabaseClient.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            });
            if (error) throw error;
        } catch (error) {
            console.error('Google Auth Error:', error);
            alert('Failed to connect to Google. Please try again.');
            btnGoogleSignIn.disabled = false;
            btnGoogleSignIn.innerHTML = '<img src="https://www.google.com/favicon.ico" alt="Google Logo" class="google-logo"> Sign in with Google';
        }
    });
}

if (btnSignOutIcon) {
    btnSignOutIcon.addEventListener('click', async () => {
        if (!supabaseClient) return;
        if (confirm("Sign out of HourForge? Your data is synced to the cloud.")) {
            await supabaseClient.auth.signOut();
            window.location.reload(); // Force reload to show login gate
        }
    });
}

function updateAuthUI() {
    if (!loginGate || !mainAppContainer) return;
    
    if (currentSession) {
        // User is logged in -> Hide Gate, Show App
        loginGate.style.display = 'none';
        restoreSavedTab();
        mainAppContainer.style.display = 'block';
    } else {
        // User is logged out -> Show Gate, Hide App
        loginGate.style.display = 'flex';
        mainAppContainer.style.display = 'none';
    }
}

