"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const env_js_1 = require("../config/env.js");
const url = env_js_1.env.SUPABASE_URL || '';
const key = env_js_1.env.SUPABASE_ANON_KEY || '';
const isValid = !!(url && key && url.startsWith('http') && key.length > 10);
if (!isValid) {
    console.warn('Supabase URL or Key is missing or invalid. Supabase functionality will be limited.');
}
exports.supabase = null;
try {
    if (isValid) {
        exports.supabase = (0, supabase_js_1.createClient)(url, key);
    }
    else {
        console.error('Supabase client creation skipped: Invalid or missing credentials.');
    }
}
catch (error) {
    console.error('Failed to initialize Supabase client:', error);
}
//# sourceMappingURL=supabase.js.map