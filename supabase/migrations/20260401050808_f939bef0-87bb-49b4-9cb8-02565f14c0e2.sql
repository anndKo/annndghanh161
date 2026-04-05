CREATE POLICY "All authenticated users can view roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);