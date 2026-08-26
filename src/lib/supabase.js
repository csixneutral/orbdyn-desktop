import { createClient } from '@supabase/supabase-js';

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '')
  .trim()
  .replace(/^['"]|['"]$/g, '');
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '')
  .trim()
  .replace(/^['"]|['"]$/g, '');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[orbdyn] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export function getAuthEmailDomain() {
  try {
    const hostname = new URL(supabaseUrl || '').hostname;
    if (hostname) return hostname;
  } catch {
    // ignore invalid URL
  }
  return 'orbdyn.app';
}

export function usernameToEmail(username) {
  return `${String(username || '').trim().toLowerCase()}@${getAuthEmailDomain()}`;
}

export function resolveAuthEmailForUsername(username, optionalContactEmail = '') {
  const contact = normalizeEmail(optionalContactEmail);
  if (contact && isValidEmail(contact)) return contact;
  return usernameToEmail(username);
}

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function isValidEmail(value) {
  const email = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const FILES_BUCKET = 'workspace-files';
