
-- Add SELECT policy for blacklisted_emails so anon/authenticated can check
CREATE POLICY "Anyone can check blacklisted emails"
ON public.blacklisted_emails
FOR SELECT
USING (true);

-- Confirm all existing unconfirmed users
UPDATE auth.users SET email_confirmed_at = now() WHERE email_confirmed_at IS NULL;
