import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://qjfzmbqqldyowgocqrqk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqZnptYnFxbGR5b3dnb2NxcnFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwOTE5OTAsImV4cCI6MjExMDY2Nzk5MH0.5RxERC_hPT4-QGV9DrJdUj8BWOEGgbqLlmwI41Il9fU";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});