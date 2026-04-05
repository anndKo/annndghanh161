-- Grant usage on public schema to anon and authenticated roles
-- This is needed for edge functions that use anon key
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant specific table permissions for security tables
GRANT SELECT, INSERT ON public.login_attempts TO anon;
GRANT SELECT, INSERT ON public.login_attempts TO authenticated;

GRANT SELECT, INSERT ON public.security_audit_log TO anon;
GRANT SELECT, INSERT ON public.security_audit_log TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_blocks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_blocks TO authenticated;

GRANT SELECT, INSERT ON public.device_fingerprints TO anon;
GRANT SELECT, INSERT ON public.device_fingerprints TO authenticated;

GRANT DELETE ON public.login_attempts TO anon;
GRANT DELETE ON public.login_attempts TO authenticated;