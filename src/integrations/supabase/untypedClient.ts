// Re-exports supabase client with 'any' typing to bypass generated type constraints
// for tables not yet in the auto-generated types.ts (e.g. classes, profiles, etc.)
import { supabase as _supabase } from './client';

// Export typed client for auth operations
export const supabaseAuth = _supabase;

// Export untyped client for .from() queries on tables not in generated types
export const supabase = _supabase as any;
