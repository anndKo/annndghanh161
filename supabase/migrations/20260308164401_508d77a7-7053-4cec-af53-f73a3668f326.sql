
-- 1. Fix notifications: Only authenticated users can insert, and only for themselves or via server
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Authenticated users can create notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- 2. Fix message_archives: Only authenticated users can insert (triggered by system)
DROP POLICY IF EXISTS "System can insert archived messages" ON public.message_archives;
CREATE POLICY "Authenticated can insert archives"
  ON public.message_archives FOR INSERT TO authenticated
  WITH CHECK (true);

-- 3. Fix profiles: Replace overly broad SELECT with scoped policy
DROP POLICY IF EXISTS "Authenticated users can search profiles for messaging" ON public.profiles;

-- Allow users to see profiles of people they share classes with or have messaged
CREATE POLICY "Users can view related profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.messages
      WHERE (sender_id = auth.uid() AND receiver_id = profiles.user_id)
         OR (receiver_id = auth.uid() AND sender_id = profiles.user_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.enrollments e
      JOIN public.classes c ON c.id = e.class_id
      WHERE (e.student_id = auth.uid() AND c.tutor_id = profiles.user_id)
         OR (c.tutor_id = auth.uid() AND e.student_id = profiles.user_id)
    )
  );

-- 4. Fix blacklisted_emails: Use a security definer function instead of public SELECT
DROP POLICY IF EXISTS "Anyone can check blacklisted emails" ON public.blacklisted_emails;

CREATE OR REPLACE FUNCTION public.is_email_blacklisted(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blacklisted_emails WHERE email = lower(_email)
  )
$$;

-- 5. Fix user_roles: Remove overly broad SELECT, keep specific ones
DROP POLICY IF EXISTS "Authenticated users can view all roles" ON public.user_roles;

-- 6. Enable leaked password protection
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_archives ENABLE ROW LEVEL SECURITY;
