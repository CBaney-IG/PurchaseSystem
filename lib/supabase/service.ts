import { createClient } from '@supabase/supabase-js'

/**
 * Service role client — bypasses RLS.
 * Use only in server-side API routes and Server Actions for mutations.
 * Never instantiate this in browser code or Client Components.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
