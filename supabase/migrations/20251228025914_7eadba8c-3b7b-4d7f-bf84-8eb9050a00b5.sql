-- Create messages table for messaging system
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for messages
CREATE POLICY "Users can view their own messages"
ON public.messages
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their received messages (mark as read)"
ON public.messages
FOR UPDATE
USING (auth.uid() = receiver_id);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create tutor_ratings table
CREATE TABLE public.tutor_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id UUID NOT NULL,
  student_id UUID NOT NULL,
  class_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tutor_id, student_id, class_id)
);

-- Enable RLS for tutor_ratings
ALTER TABLE public.tutor_ratings ENABLE ROW LEVEL SECURITY;

-- RLS policies for tutor_ratings
CREATE POLICY "Anyone can view tutor ratings"
ON public.tutor_ratings
FOR SELECT
USING (true);

CREATE POLICY "Students can create ratings for classes they enrolled"
ON public.tutor_ratings
FOR INSERT
WITH CHECK (
  auth.uid() = student_id AND
  EXISTS (
    SELECT 1 FROM enrollments 
    WHERE enrollments.student_id = auth.uid() 
    AND enrollments.class_id = tutor_ratings.class_id
    AND enrollments.status = 'approved'
  )
);

-- Add display_id column to classes table for easy search
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS display_id TEXT UNIQUE;

-- Create function to generate display_id
CREATE OR REPLACE FUNCTION public.generate_class_display_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.display_id := 'CL' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-generate display_id
CREATE TRIGGER generate_class_display_id_trigger
BEFORE INSERT ON public.classes
FOR EACH ROW
WHEN (NEW.display_id IS NULL)
EXECUTE FUNCTION public.generate_class_display_id();

-- Enable realtime for messages and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;