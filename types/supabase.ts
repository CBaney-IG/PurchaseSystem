// Auto-generated Supabase types — placeholder until F-003 schema is complete.
// Regenerate after migrations are applied:
//   npx supabase gen types typescript --local > types/supabase.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
