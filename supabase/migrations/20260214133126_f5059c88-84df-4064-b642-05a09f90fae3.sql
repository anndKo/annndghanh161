
-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view roles" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Users can update own role" ON public.user_roles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can insert roles" ON public.user_roles FOR INSERT WITH CHECK (true);

-- Classes table
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  display_id TEXT,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL DEFAULT 'Lớp 10',
  teaching_format TEXT NOT NULL DEFAULT 'offline',
  class_type TEXT NOT NULL DEFAULT 'group',
  price_per_session NUMERIC NOT NULL DEFAULT 0,
  max_students INTEGER NOT NULL DEFAULT 10,
  tutor_id UUID,
  tutor_percentage NUMERIC DEFAULT 70,
  address TEXT,
  discount_percent NUMERIC DEFAULT 0,
  schedule_days TEXT,
  schedule_start_time TIME,
  schedule_end_time TIME,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view classes" ON public.classes FOR SELECT USING (true);
CREATE POLICY "Admin can insert classes" ON public.classes FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can update classes" ON public.classes FOR UPDATE USING (true);
CREATE POLICY "Admin can delete classes" ON public.classes FOR DELETE USING (true);

-- Enrollments table
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  enrollment_type TEXT DEFAULT 'real',
  trial_expires_at TIMESTAMP WITH TIME ZONE,
  enrollment_expires_at TIMESTAMP WITH TIME ZONE,
  removal_reason TEXT,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view enrollments" ON public.enrollments FOR SELECT USING (true);
CREATE POLICY "Students can insert enrollments" ON public.enrollments FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can update enrollments" ON public.enrollments FOR UPDATE USING (true);
CREATE POLICY "Admin can delete enrollments" ON public.enrollments FOR DELETE USING (true);

-- Tutor applications table
CREATE TABLE IF NOT EXISTS public.tutor_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  current_address TEXT,
  teaching_areas TEXT[] DEFAULT '{}',
  school_name TEXT,
  faculty TEXT,
  best_subject TEXT,
  teachable_subjects TEXT[] DEFAULT '{}',
  teaching_format TEXT DEFAULT 'offline',
  student_id_front TEXT,
  student_id_back TEXT,
  achievement_files TEXT[],
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.tutor_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view applications" ON public.tutor_applications FOR SELECT USING (true);
CREATE POLICY "Users can insert own application" ON public.tutor_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can update applications" ON public.tutor_applications FOR UPDATE USING (true);
CREATE POLICY "Admin can delete applications" ON public.tutor_applications FOR DELETE USING (true);

-- Tutor ratings table
CREATE TABLE IF NOT EXISTS public.tutor_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id UUID NOT NULL,
  student_id UUID NOT NULL,
  class_id UUID REFERENCES public.classes(id),
  rating INTEGER NOT NULL DEFAULT 5,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.tutor_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view ratings" ON public.tutor_ratings FOR SELECT USING (true);
CREATE POLICY "Students can insert ratings" ON public.tutor_ratings FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can update own ratings" ON public.tutor_ratings FOR UPDATE USING (auth.uid() = student_id);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT false,
  related_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT false,
  file_url TEXT,
  file_type TEXT,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can insert messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update own messages" ON public.messages FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Attendance table
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  checked_in BOOLEAN NOT NULL DEFAULT false,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view attendance" ON public.attendance FOR SELECT USING (true);
CREATE POLICY "Anyone can insert attendance" ON public.attendance FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update attendance" ON public.attendance FOR UPDATE USING (true);

-- Class requests table (tutor requests to take a class)
CREATE TABLE IF NOT EXISTS public.class_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id UUID NOT NULL,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.class_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view class requests" ON public.class_requests FOR SELECT USING (true);
CREATE POLICY "Tutors can insert class requests" ON public.class_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can update class requests" ON public.class_requests FOR UPDATE USING (true);
CREATE POLICY "Admin can delete class requests" ON public.class_requests FOR DELETE USING (true);

-- Blacklisted emails table
CREATE TABLE IF NOT EXISTS public.blacklisted_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.blacklisted_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can view blacklist" ON public.blacklisted_emails FOR SELECT USING (true);
CREATE POLICY "Admin can insert blacklist" ON public.blacklisted_emails FOR INSERT WITH CHECK (true);

-- Password reset requests table
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view reset requests" ON public.password_reset_requests FOR SELECT USING (true);
CREATE POLICY "Users can insert reset requests" ON public.password_reset_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can update reset requests" ON public.password_reset_requests FOR UPDATE USING (true);

-- Tutor complaints table
CREATE TABLE IF NOT EXISTS public.tutor_complaints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id UUID NOT NULL,
  notification_id UUID,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.tutor_complaints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view complaints" ON public.tutor_complaints FOR SELECT USING (true);
CREATE POLICY "Tutors can insert complaints" ON public.tutor_complaints FOR INSERT WITH CHECK (auth.uid() = tutor_id);
CREATE POLICY "Admin can update complaints" ON public.tutor_complaints FOR UPDATE USING (true);

-- Payment requests table
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  bank_info TEXT,
  proof_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view payment requests" ON public.payment_requests FOR SELECT USING (true);
CREATE POLICY "Tutors can insert payment requests" ON public.payment_requests FOR INSERT WITH CHECK (auth.uid() = tutor_id);
CREATE POLICY "Admin can update payment requests" ON public.payment_requests FOR UPDATE USING (true);

-- Assignments table (tutor sends tasks to students)
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view assignments" ON public.assignments FOR SELECT USING (true);
CREATE POLICY "Tutors can insert assignments" ON public.assignments FOR INSERT WITH CHECK (auth.uid() = tutor_id);
CREATE POLICY "Tutors can update assignments" ON public.assignments FOR UPDATE USING (auth.uid() = tutor_id);
CREATE POLICY "Tutors can delete assignments" ON public.assignments FOR DELETE USING (auth.uid() = tutor_id);

-- Enable realtime for messages and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Auto-create profile and role on signup via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'role', 'student'));
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Auto-generate display_id for classes
CREATE OR REPLACE FUNCTION public.generate_class_display_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.display_id IS NULL OR NEW.display_id = '' THEN
    NEW.display_id := 'CL' || LPAD(nextval('class_display_id_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE SEQUENCE IF NOT EXISTS public.class_display_id_seq START WITH 10000;

CREATE TRIGGER set_class_display_id
  BEFORE INSERT ON public.classes
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_class_display_id();

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('tutor-documents', 'tutor-documents', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('assignments', 'assignments', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for tutor-documents
CREATE POLICY "Users can upload tutor documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'tutor-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view tutor documents" ON storage.objects FOR SELECT USING (bucket_id = 'tutor-documents');

-- Storage policies for assignments
CREATE POLICY "Users can upload assignments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'assignments');
CREATE POLICY "Anyone can view assignments" ON storage.objects FOR SELECT USING (bucket_id = 'assignments');
