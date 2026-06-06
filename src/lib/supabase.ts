import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

const url = env.SUPABASE_URL || '';
// Usar service_role_key se disponível (melhor para operações server-side)
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || '';

const isValid = !!(url && key && url.startsWith('http') && key.length > 10);

if (!isValid) {
    console.warn('Supabase URL or Key is missing or invalid. Supabase functionality will be limited.');
} else {
    console.log('✅ Supabase client configured with:', env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE_KEY' : 'ANON_KEY');
}

export let supabase: any = null;

try {
    if (isValid) {
        supabase = createClient(url, key, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
        console.log('✅ Supabase client initialized successfully!');
    } else {
        console.error('Supabase client creation skipped: Invalid or missing credentials.');
    }
} catch (error) {
    console.error('Failed to initialize Supabase client:', error);
}
