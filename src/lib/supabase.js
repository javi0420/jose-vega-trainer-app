import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log("DEBUG: Conectando a Supabase en:", supabaseUrl);

// LA LÍNEA CRÍTICA ES EL 'export'
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Expose for e2e testing
if (typeof window !== 'undefined') {
    window.supabase = supabase
}