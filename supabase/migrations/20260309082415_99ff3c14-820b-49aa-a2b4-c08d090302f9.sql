-- Allow anon/authenticated to insert into login_attempts
CREATE POLICY "Allow insert login attempts" ON public.login_attempts
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Allow anon/authenticated to insert into security_audit_log
CREATE POLICY "Allow insert security audit log" ON public.security_audit_log
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Allow anon/authenticated to insert device_blocks  
CREATE POLICY "Allow insert device blocks" ON public.device_blocks
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Allow anon/authenticated to update device_blocks
CREATE POLICY "Allow update device blocks" ON public.device_blocks
FOR UPDATE TO anon, authenticated
USING (true);

-- Allow anon/authenticated to delete device_blocks (for 10-day reset)
CREATE POLICY "Allow delete device blocks" ON public.device_blocks
FOR DELETE TO anon, authenticated
USING (true);

-- Allow anon/authenticated to select login_attempts for counting
CREATE POLICY "Allow select login attempts for security" ON public.login_attempts
FOR SELECT TO anon, authenticated
USING (true);

-- Allow anon/authenticated to delete old login_attempts (for 10-day reset)
CREATE POLICY "Allow delete old login attempts" ON public.login_attempts
FOR DELETE TO anon, authenticated
USING (true);

-- Allow anon/authenticated to insert device_fingerprints
CREATE POLICY "Allow insert device fingerprints" ON public.device_fingerprints
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Allow anon/authenticated to select device_fingerprints count
CREATE POLICY "Allow select device fingerprints count" ON public.device_fingerprints
FOR SELECT TO anon, authenticated
USING (true);