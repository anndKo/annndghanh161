-- =========================
-- EXTENSIONS
-- =========================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- CLEAN OLD POLICIES
-- =========================
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  )
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "%s" ON public.%I',
      r.policyname,
      r.tablename
    );
  END LOOP;
END $$;

-- =========================
-- PROFILES
-- =========================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT DEFAULT '',
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select
ON public.profiles
FOR SELECT
USING (true);

CREATE POLICY profiles_insert_own
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- =========================
-- USER ROLES
-- =========================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY roles_select
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY roles_insert_own
ON public.user_roles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- =========================
-- ADMIN CHECK FUNCTION
-- =========================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
$$;

-- =========================
-- CLASSES
-- =========================
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id TEXT,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade TEXT DEFAULT 'Lớp 10',
  teaching_format TEXT DEFAULT 'offline',
  class_type TEXT DEFAULT 'group',
  price_per_session NUMERIC DEFAULT 0,
  max_students INTEGER DEFAULT 10,
  tutor_id UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY classes_select
ON public.classes
FOR SELECT
USING (is_active = true);

CREATE POLICY classes_admin_manage
ON public.classes
FOR ALL
USING (public.is_admin());

-- =========================
-- ENROLLMENTS
-- =========================
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY enrollments_select_own
ON public.enrollments
FOR SELECT
USING (
  auth.uid() = student_id
  OR public.is_admin()
);

CREATE POLICY enrollments_insert_student
ON public.enrollments
FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY enrollments_admin_update
ON public.enrollments
FOR UPDATE
USING (public.is_admin());

-- =========================
-- MESSAGES
-- =========================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY messages_select_own
ON public.messages
FOR SELECT
USING (
  auth.uid() = sender_id
  OR auth.uid() = receiver_id
);

CREATE POLICY messages_insert_own
ON public.messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY messages_update_own
ON public.messages
FOR UPDATE
USING (
  auth.uid() = sender_id
  OR auth.uid() = receiver_id
);

-- =========================
-- REALTIME SAFE ADD
-- =========================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
  END;
END $$;

-- =========================
-- AUTO CREATE PROFILE + ROLE
-- =========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
