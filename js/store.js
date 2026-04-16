// ==========================================
// [1] ENVIRONMENT, TYPES & GLOBAL STATE
// ==========================================

/**
 * @typedef {Object} RevisionStatus
 * @property {boolean} done - Whether this revision step is completed.
 * @property {string|null} completedAt - ISO timestamp when it was checked off.
 */

/**
 * @typedef {Object} StudySession
 * @property {string} id - UUID generated via crypto.randomUUID(). Critical for deep merge sync.
 * @property {string} subject - e.g. "Physics".
 * @property {string} topic - e.g. "Newton's Laws".
 * @property {string} dateRead - YYYY-MM-DD.
 * @property {number} updated_at - Unix timestamp of the last local modification.
 * @property {string} [createdAt] - ISO timestamp when originally created.
 * @property {Object} revisions - Holds 2-day, 4-day, and 7-day status.
 * @property {RevisionStatus} revisions.rev2
 * @property {RevisionStatus} revisions.rev4
 * @property {RevisionStatus} revisions.rev7
 */

/**
 * @typedef {Object} TimeLog
 * @property {string} id - UUID.
 * @property {string} subject - e.g. "Physics" or "Sleep" or "".
 * @property {string} task - e.g. "Solving equations".
 * @property {string} date - YYYY-MM-DD.
 * @property {string} startTime - HH:MM (24-hour).
 * @property {string} endTime - HH:MM (24-hour).
 * @property {number} duration - Calculated hours in decimal.
 * @property {string} notes - Optional notes.
 * @property {number} updated_at - Unix timestamp.
 * @property {string} [createdAt] - ISO timestamp.
 */

/**
 * @typedef {Object} StudentProfile
 * @property {string} name
 * @property {string} grade
 * @property {string} faculty
 * @property {string[]} subjects
 * @property {string} exam1Label
 * @property {string} exam1Date
 * @property {string} exam2Label
 * @property {string} exam2Date
 * @property {boolean} setupComplete
 */

let studySessions = JSON.parse(localStorage.getItem('studySessions')) || [];
let timeLogs = JSON.parse(localStorage.getItem('timeLogs')) || [];
let aiRatingsHistory = JSON.parse(localStorage.getItem('aiRatingsHistory')) || [];

// Migrate old dateLabel formats to YYYY-MM-DD, add period field, and deduplicate
{
    let changed = false;
    const byKey = {};
    aiRatingsHistory.forEach(r => {
        if (r.dateLabel && !/^\d{4}-\d{2}-\d{2}$/.test(r.dateLabel)) {
            const d = new Date(r.dateLabel);
            r.dateLabel = !isNaN(d.getTime()) ? getLocalDateStr(d) : getLocalDateStr(new Date(r.timestamp));
            changed = true;
        }
        // Migrate: old entries without period field default to 'today'
        if (!r.period) { r.period = 'today'; changed = true; }
        // Dedup key: date + period (so daily, weekly, monthly ratings coexist)
        const key = `${r.dateLabel}_${r.period}`;
        if (!byKey[key] || r.timestamp > byKey[key].timestamp) {
            byKey[key] = r;
        }
    });
    const deduped = Object.values(byKey);
    if (changed || deduped.length !== aiRatingsHistory.length) {
        aiRatingsHistory = deduped;
        localStorage.setItem('aiRatingsHistory', JSON.stringify(aiRatingsHistory));
        // Note: uploadDataToCloud() will be called after Supabase initializes if user is logged in
    }
}

// Immediately seed IndexedDB mirror from localStorage if data exists
// (ensures IndexedDB always has a copy even if it was never mirrored before)
if (studySessions.length > 0 || timeLogs.length > 0) {
    setTimeout(() => {
        idb.set('studySessions', studySessions).catch(() => { });
        idb.set('timeLogs', timeLogs).catch(() => { });
    }, 500);
}
let currentFilter = 'all';
let currentTableSubject = getSubjects()[0] || 'General';

// Fast timeout wrapper to prevent hanging file system operations
function withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('TIMEOUT')), ms);
        promise.then(value => { clearTimeout(timer); resolve(value); })
            .catch(err => { clearTimeout(timer); reject(err); });
    });
}

// Auto Backup State
let backupDirHandle = null;
let timeLogBackupFolderHandle = null;

// Lightweight IndexedDB wrapper for persisting the backup directory handles
const idb = {
        async getDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('HourForgeDB', 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('store')) {
                    db.createObjectStore('store');
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    async get(key) {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('store', 'readonly');
            const req = tx.objectStore('store').get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },
    async set(key, val) {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('store', 'readwrite');
            const req = tx.objectStore('store').put(val, key);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    },
    async delete(key) {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('store', 'readwrite');
            const req = tx.objectStore('store').delete(key);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }
};

// App-level state (declared early — referenced by Supabase auth handlers)
let isAppInitialized = false;
let realtimeChannel = null;
// ==========================================
// DB MIGRATION (StudyTracker -> HourForge)
// ==========================================
async function migrateDatabaseIfNeeded() {
    const oldDBName = 'StudyTrackerDB';
    const newDBName = 'HourForgeDB';

    // Check if migration already done
    const migrationDone = localStorage.getItem('dbMigrationDone');
    if (migrationDone) return;

    return new Promise((resolve) => {
        const checkRequest = indexedDB.open(oldDBName);
        checkRequest.onsuccess = async (e) => {
            const db = e.target.result;
            // If the old DB doesn't have our 'store', nothing to migrate
            if (!db.objectStoreNames.contains('store')) {
                db.close();
                localStorage.setItem('dbMigrationDone', 'true');
                resolve();
                return;
            }

            console.log('🏁 Starting DB Migration from StudyTracker to HourForge...');
            
            try {
                const tx = db.transaction('store', 'readonly');
                const store = tx.objectStore('store');
                const keysRequest = store.getAllKeys();
                
                keysRequest.onsuccess = async () => {
                    const keys = keysRequest.result;
                    const migrationData = {};
                    
                    for (const key of keys) {
                        migrationData[key] = await new Promise(r => {
                            const req = store.get(key);
                            req.onsuccess = () => r(req.result);
                        });
                    }

                    db.close();

                    // Now write to new DB
                    for (const [key, val] of Object.entries(migrationData)) {
                        await idb.set(key, val);
                    }

                    console.log('✅ DB Migration Complete!');
                    localStorage.setItem('dbMigrationDone', 'true');
                    
                    // Cleanup: Delete old DB
                    indexedDB.deleteDatabase(oldDBName);
                }
            } catch (err) {
                console.error('❌ DB Migration failed:', err);
            }
            resolve();
        };
        checkRequest.onerror = () => {
            // Old DB doesn't exist or error, just skip
            resolve();
        };
    });
}


// ==========================================
// DATA RECOVERY ENGINE
// ==========================================
async function recoverDataIfNeeded() {
    // If localStorage already has data, no recovery needed
    const lsSessions = localStorage.getItem('studySessions');
    const lsTimeLogs = localStorage.getItem('timeLogs');
    const hasLocalSessions = lsSessions && JSON.parse(lsSessions).length > 0;
    const hasLocalTimeLogs = lsTimeLogs && JSON.parse(lsTimeLogs).length > 0;

    if (hasLocalSessions || hasLocalTimeLogs) return false;

    console.warn('⚠️ localStorage is empty! Attempting data recovery...');

    // LAYER 1: Try IndexedDB mirror
    try {
        const idbSessions = await idb.get('studySessions');
        const idbTimeLogs = await idb.get('timeLogs');
        if ((idbSessions && idbSessions.length > 0) || (idbTimeLogs && idbTimeLogs.length > 0)) {
            studySessions = idbSessions || [];
            timeLogs = idbTimeLogs || [];
            localStorage.setItem('studySessions', JSON.stringify(studySessions));
            localStorage.setItem('timeLogs', JSON.stringify(timeLogs));
            console.log('✅ Data recovered from IndexedDB mirror');
            return 'indexeddb';
        }
    } catch (e) {
        console.warn('IndexedDB recovery failed:', e);
    }

    // LAYER 2: We no longer try to recover from backup file on load to prevent Chrome freezing
    // (We rely exclusively on IndexedDB mirror which was initialized above)
    return false;
}
