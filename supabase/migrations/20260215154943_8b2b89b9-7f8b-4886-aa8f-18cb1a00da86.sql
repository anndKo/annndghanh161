
-- Allow all authenticated users to view user roles (needed for verified badges)
CREATE POLICY "Authenticated users can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);
