const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('script.js', 'utf8');

const dom = new JSDOM(html, { 
    runScripts: "dangerously", 
    resources: "usable",
    url: "http://localhost/", // Needed for localStorage
    beforeParse(window) {
        // Mock Sentry
        window.Sentry = { init: () => {} };
        // Mock Chart.js
        window.Chart = function() { return { destroy: () => {}, update: () => {} }; };
        window.Chart.register = () => {};
        
        // Let's hook console.error so we definitely see it
        const originalError = window.console.error;
        window.console.error = function(...args) {
            console.log("CRASH CAUGHT:", ...args);
            originalError.apply(window.console, args);
        };
        
        // Mock IndexedDB
        window.indexedDB = {
            open: () => ({
                onupgradeneeded: null, onsuccess: null, onerror: null,
                result: {
                    createObjectStore: () => ({ createIndex: () => {} }),
                    transaction: () => ({ objectStore: () => ({ put: () => ({ onsuccess:null, onerror:null }), get: () => ({ onsuccess:null, onerror:null }), getAll: () => ({ onsuccess:null, onerror:null }) }) })
                }
            }),
            deleteDatabase: () => {}
        };
        // Mock IDB-Keyval
        window.idb = {
            set: async () => {}, get: async () => {}, clear: async () => {}
        };
        
        // IMPORTANT: Mock Supabase Session to simulate a successful Google Login
        window.supabase = {
            createClient: () => ({
                auth: {
                    onAuthStateChange: (callback) => {
                        // Immediately fire SIGNED_IN
                        setTimeout(() => {
                           callback('SIGNED_IN', { user: { id: 'test-uuid', email: 'test@example.com' }});
                        }, 500);
                    },
                    getSession: async () => ({ data: { session: null }}) // Let onAuthStateChange handle it
                },
                from: () => ({
                    select: () => ({ eq: () => ({ single: async () => ({ data: null, error: { code: 'PGRST116' } }) }) }),
                    upsert: async () => ({ data: null, error: null })
                })
            })
        };
    }
});

// Load the script
const scriptEl = dom.window.document.createElement('script');
scriptEl.textContent = js;
dom.window.document.body.appendChild(scriptEl);

console.log("Waiting for initialization trace...");
