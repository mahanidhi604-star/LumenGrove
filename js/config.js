// js/config.js - Public Supabase Configuration and Client Factory
// Only public anon key and project URL are permitted in client code.
// Secrets belong strictly in server functions / environment variables.

window.SUPABASE_URL = window.SUPABASE_URL || 'https://[YOUR_SUPABASE_PROJECT_ID].supabase.co';
window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || '[YOUR_SUPABASE_ANON_KEY]';

// Initialize Supabase Client if credentials are provided and library is present
window.supabaseClient = null;
if (
  typeof window.supabase !== 'undefined' &&
  window.SUPABASE_URL &&
  !window.SUPABASE_URL.includes('[YOUR_SUPABASE_PROJECT_ID]')
) {
  try {
    window.supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
    console.log('LumenGrove: Connected to Supabase Auth.');
  } catch (err) {
    console.warn('LumenGrove: Supabase client initialization error:', err);
  }
}
