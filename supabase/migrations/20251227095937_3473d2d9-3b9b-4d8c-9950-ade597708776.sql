-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'tutor', 'student');

-- Create tutor_status enum
CREATE TYPE public.tutor_status AS ENUM ('pending', 'approved', 'rejected');

-- Create teaching_format enum
CREATE TYPE public.teaching_format AS ENUM ('online', 'offline', 'both');

-- Create class_type enum
CREATE TYPE public.class_type AS ENUM ('group', 'one_on_one');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create tutor_applications table
CREATE TABLE public.tutor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  current_address TEXT NOT NULL,
  teaching_areas TEXT[] NOT NULL,
  school_name TEXT NOT NULL,
  faculty TEXT NOT NULL,
  best_subject TEXT NOT NULL,
  teachable_subjects TEXT[] NOT NULL,
  teaching_format teaching_format NOT NULL DEFAULT 'both',
  student_id_front TEXT NOT NULL,
  student_id_back TEXT NOT NULL,
  achievement_files TEXT[],
  status tutor_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create classes table
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  teaching_format teaching_format NOT NULL DEFAULT 'both',
  class_type class_type NOT NULL DEFAULT 'group',
  price_per_session DECIMAL(10,2) NOT NULL,
  max_students INTEGER DEFAULT 20,
  tutor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create enrollments table
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id)
);

-- Create assignments table
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  grade TEXT,
  feedback TEXT
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is first user (becomes admin)
CREATE OR REPLACE FUNCTION public.is_first_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
$$;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email
  );
  
  -- If first user, make them admin
  IF public.is_first_user() THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    -- Default role based on metadata
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'student'));
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tutor_applications_updated_at
  BEFORE UPDATE ON public.tutor_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for tutor_applications
CREATE POLICY "Users can view own application"
  ON public.tutor_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own application"
  ON public.tutor_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending application"
  ON public.tutor_applications FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all applications"
  ON public.tutor_applications FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update applications"
  ON public.tutor_applications FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for classes
CREATE POLICY "Everyone can view active classes"
  ON public.classes FOR SELECT
  USING (is_active = true);

CREATE POLICY "Tutors can view their classes"
  ON public.classes FOR SELECT
  USING (tutor_id = auth.uid());

CREATE POLICY "Admins can manage classes"
  ON public.classes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for enrollments
CREATE POLICY "Students can view own enrollments"
  ON public.enrollments FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students can create enrollments"
  ON public.enrollments FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Tutors can view enrollments in their classes"
  ON public.enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = class_id AND classes.tutor_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage enrollments"
  ON public.enrollments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for assignments
CREATE POLICY "Students can view own assignments"
  ON public.assignments FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students can create own assignments"
  ON public.assignments FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Tutors can view assignments in their classes"
  ON public.assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = class_id AND classes.tutor_id = auth.uid()
    )
  );

CREATE POLICY "Tutors can update assignments in their classes"
  ON public.assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = class_id AND classes.tutor_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage assignments"
  ON public.assignments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for tutor documents
INSERT INTO storage.buckets (id, name, public) VALUES ('tutor-documents', 'tutor-documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('assignments', 'assignments', false);

-- Storage policies for tutor-documents
CREATE POLICY "Users can upload own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'tutor-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tutor-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all tutor documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tutor-documents' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies for assignments
CREATE POLICY "Students can upload assignments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'assignments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Students can view own assignments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'assignments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Tutors and admins can view assignments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'assignments' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'tutor')
    )
  );