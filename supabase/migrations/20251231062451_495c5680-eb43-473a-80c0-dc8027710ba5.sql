-- Create class_posts table for tutor posts
CREATE TABLE public.class_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create class_post_files table for attached files
CREATE TABLE public.class_post_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.class_posts(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create class_comments table for student comments
CREATE TABLE public.class_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.class_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create class_submissions table for student submissions
CREATE TABLE public.class_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.class_posts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  grade TEXT,
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create class_messages table for in-class messaging
CREATE TABLE public.class_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.class_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_post_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for class_posts
CREATE POLICY "Tutors can manage their class posts"
ON public.class_posts FOR ALL
USING (tutor_id = auth.uid());

CREATE POLICY "Students can view posts in enrolled classes"
ON public.class_posts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.enrollments 
    WHERE enrollments.class_id = class_posts.class_id 
    AND enrollments.student_id = auth.uid() 
    AND enrollments.status = 'approved'
  )
);

CREATE POLICY "Admins can view all posts"
ON public.class_posts FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for class_post_files
CREATE POLICY "Users can view files for posts they can see"
ON public.class_post_files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.class_posts 
    WHERE class_posts.id = class_post_files.post_id 
    AND (
      class_posts.tutor_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.enrollments 
        WHERE enrollments.class_id = class_posts.class_id 
        AND enrollments.student_id = auth.uid() 
        AND enrollments.status = 'approved'
      )
    )
  )
);

CREATE POLICY "Tutors can manage files for their posts"
ON public.class_post_files FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.class_posts 
    WHERE class_posts.id = class_post_files.post_id 
    AND class_posts.tutor_id = auth.uid()
  )
);

-- RLS Policies for class_comments
CREATE POLICY "Users can view comments on posts they can see"
ON public.class_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.class_posts 
    WHERE class_posts.id = class_comments.post_id 
    AND (
      class_posts.tutor_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.enrollments 
        WHERE enrollments.class_id = class_posts.class_id 
        AND enrollments.student_id = auth.uid() 
        AND enrollments.status = 'approved'
      )
    )
  )
);

CREATE POLICY "Enrolled students can create comments"
ON public.class_comments FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.class_posts 
    JOIN public.enrollments ON enrollments.class_id = class_posts.class_id
    WHERE class_posts.id = class_comments.post_id 
    AND enrollments.student_id = auth.uid() 
    AND enrollments.status = 'approved'
  )
);

CREATE POLICY "Tutors can create comments on their posts"
ON public.class_comments FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.class_posts 
    WHERE class_posts.id = class_comments.post_id 
    AND class_posts.tutor_id = auth.uid()
  )
);

-- RLS Policies for class_submissions
CREATE POLICY "Students can view own submissions"
ON public.class_submissions FOR SELECT
USING (student_id = auth.uid());

CREATE POLICY "Students can create submissions"
ON public.class_submissions FOR INSERT
WITH CHECK (
  auth.uid() = student_id AND
  EXISTS (
    SELECT 1 FROM public.class_posts 
    JOIN public.enrollments ON enrollments.class_id = class_posts.class_id
    WHERE class_posts.id = class_submissions.post_id 
    AND enrollments.student_id = auth.uid() 
    AND enrollments.status = 'approved'
  )
);

CREATE POLICY "Tutors can view submissions in their classes"
ON public.class_submissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.class_posts 
    WHERE class_posts.id = class_submissions.post_id 
    AND class_posts.tutor_id = auth.uid()
  )
);

CREATE POLICY "Tutors can update submissions (grading)"
ON public.class_submissions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.class_posts 
    WHERE class_posts.id = class_submissions.post_id 
    AND class_posts.tutor_id = auth.uid()
  )
);

-- RLS Policies for class_messages
CREATE POLICY "Users can view their class messages"
ON public.class_messages FOR SELECT
USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Enrolled students can send messages to tutor"
ON public.class_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.classes 
    JOIN public.enrollments ON enrollments.class_id = classes.id
    WHERE classes.id = class_messages.class_id 
    AND (
      (enrollments.student_id = auth.uid() AND enrollments.status = 'approved' AND receiver_id = classes.tutor_id)
      OR (classes.tutor_id = auth.uid())
    )
  )
);

CREATE POLICY "Users can mark their messages as read"
ON public.class_messages FOR UPDATE
USING (receiver_id = auth.uid());

-- Enable realtime for class_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.class_messages;

-- Create trigger for updated_at on class_posts
CREATE TRIGGER update_class_posts_updated_at
BEFORE UPDATE ON public.class_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on class_submissions  
CREATE TRIGGER update_class_submissions_updated_at
BEFORE UPDATE ON public.class_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();