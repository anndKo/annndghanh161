-- Fix password reset INSERT policy to be PERMISSIVE for unauthenticated users
DROP POLICY IF EXISTS "Anyone can create password reset requests" ON public.password_reset_requests;
CREATE POLICY "Anyone can create password reset requests"
  ON public.password_reset_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);