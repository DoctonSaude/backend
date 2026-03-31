import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

const url = env.SUPABASE_URL || '';
const key = env.SUPABASE_ANON_KEY || '';

const isValid = !!(url && key && url.startsWith('http') && key.length > 10);

if (!isValid) {
    console.warn('Supabase URL or Key is missing or invalid. Supabase functionality will be limited.');
}

export let supabase: any = null;

try {
    if (isValid) {
        supabase = createClient(url, key);
    } else {
        console.error('Supabase client creation skipped: Invalid or missing credentials.');
    }
} catch (error) {
    console.error('Failed to initialize Supabase client:', error);
}
