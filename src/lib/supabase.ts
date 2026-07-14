import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** True when Supabase credentials were provided at build time. When false,
 *  the app renders a friendly setup screen instead of trying to sign in. */
export const supabaseReady = Boolean(URL && ANON_KEY)

/** Client is exported only when credentials exist. Callers must gate on
 *  `supabaseReady` before using it. */
export const supabase: SupabaseClient | null = supabaseReady
  ? createClient(URL as string, ANON_KEY as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

/** Storage bucket that holds per-user photos. */
export const PHOTO_BUCKET = 'photos'
