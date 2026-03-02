
-- Drop the restrictive INSERT policy that requires auth.uid() = user_id
-- since unauthenticated users need to submit forgot password requests
DROP POLICY IF EXISTS "Users can insert reset requests" ON public.password_reset_requests;
