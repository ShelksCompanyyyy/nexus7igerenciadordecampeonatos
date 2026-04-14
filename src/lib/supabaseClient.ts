import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://cnktlbsvtoobbftoqtka.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNua3RsYnN2dG9vYmJmdG9xdGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1OTQ0NjEsImV4cCI6MjA5MTE3MDQ2MX0.HJTapkPU8HXYOsXbNfLJwjwsWm9q4gdkU0464Uc_vXg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
